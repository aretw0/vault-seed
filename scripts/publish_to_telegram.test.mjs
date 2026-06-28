import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishToTelegram } from "./publish_to_telegram.mjs";

const ENV = { TELEGRAM_BOT_TOKEN: "tok-test", TELEGRAM_CHAT_ID: "-100999" };

function tempDir() {
  const dir = join(tmpdir(), `tg-outbox-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function delivery(note, channelId) {
  const destinationId = `${channelId}:default`;
  return {
    id: `${note.id}::${channelId}`,
    channelId,
    providerId: channelId,
    destination: { id: destinationId, channelId, providerId: channelId, address: destinationId },
    idempotencyKey: `channel-delivery:${channelId}:${destinationId}:sha256:${note.sha256}`,
    contentHash: { algorithm: "sha256", value: note.sha256 },
    createdAt: "2026-05-26T00:00:00.000Z",
    review: { required: false, state: "not-required" },
    labels: [`item:${note.id}`],
  };
}

function makeOutbox(items) {
  const withIds = items.map((it, i) => ({
    id: it.id ?? `item-${i}`,
    sha256: it.sha256 ?? `hash-${i}`,
    ...it,
  }));
  const deliveries = withIds.flatMap((it) => (it.channels ?? []).map((ch) => delivery(it, ch)));
  return JSON.stringify({
    schema: "refarm.channel-delivery-envelope.v1",
    createdAt: "2026-05-26T00:00:00.000Z",
    producer: "vault-seed:dgk-outbox",
    schemaVersion: 1,
    deliveries,
    items: withIds,
  });
}

function mockPost(responses) {
  let i = 0;
  return async (_url, _body) => responses[i++] ?? { ok: true, result: { message_id: i } };
}

describe("publishToTelegram — credenciais ausentes", () => {
  test("retorna {sent:0} quando token ausente", async () => {
    const r = await publishToTelegram({ env: {} });
    assert.deepEqual(r, { sent: 0, skipped: 0 });
  });

  test("retorna {sent:0} quando chat_id ausente", async () => {
    const r = await publishToTelegram({ env: { TELEGRAM_BOT_TOKEN: "tok" } });
    assert.deepEqual(r, { sent: 0, skipped: 0 });
  });
});

describe("publishToTelegram — outbox", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("retorna {sent:0} quando outbox não existe", async () => {
    const r = await publishToTelegram({
      env: ENV,
      outboxPath: join(dir, "missing.json"),
      statePath: join(dir, "state.json"),
    });
    assert.deepEqual(r, { sent: 0, skipped: 0 });
  });

  test("retorna {sent:0} quando outbox não tem itens com channel=telegram", async () => {
    const outboxPath = join(dir, "outbox.json");
    writeFileSync(outboxPath, makeOutbox([
      { title: "Post", path: "a.md", channels: ["mastodon"] },
    ]));
    const r = await publishToTelegram({
      env: ENV,
      outboxPath,
      statePath: join(dir, "state.json"),
    });
    assert.deepEqual(r, { sent: 0, skipped: 0 });
  });

  test("envia nota com channel=telegram e retorna {sent:1}", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    writeFileSync(outboxPath, makeOutbox([
      { title: "Jardim digital", path: "30/jardim.md", channels: ["telegram"] },
    ]));
    const r = await publishToTelegram({
      env: ENV,
      outboxPath,
      statePath,
      httpPost: mockPost([{ ok: true, result: { message_id: 1 } }]),
    });
    assert.equal(r.sent, 1);
    assert.equal(r.skipped, 0);
    const saved = JSON.parse(readFileSync(statePath, "utf8"));
    // Contract path: state is keyed by the delivery idempotencyKey, not sha(path).
    assert.ok(Object.keys(saved.sent).includes("channel-delivery:telegram:telegram:default:sha256:hash-0"));
    // Receipt recorded in the channel-policy shape.
    assert.ok(saved.receipts.some((r) => r.itemId === "item-0::telegram" && r.status === "sent"));
  });

  test("não reenvia nota já registrada no state", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    const note = { title: "Nota", path: "nota.md", channels: ["telegram"] };
    writeFileSync(outboxPath, makeOutbox([note]));

    const postCalls = [];
    const httpPost = async (url, body) => { postCalls.push(body); return { ok: true }; };

    // primeira vez — envia
    await publishToTelegram({ env: ENV, outboxPath, statePath, httpPost });
    assert.equal(postCalls.length, 1);

    // segunda vez — não envia (já no state)
    await publishToTelegram({ env: ENV, outboxPath, statePath, httpPost });
    assert.equal(postCalls.length, 1, "não deve reenviar nota já enviada");
  });

  test("dry-run não chama httpPost e não atualiza state", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    writeFileSync(outboxPath, makeOutbox([
      { title: "Nota seca", path: "seca.md", channels: ["telegram"] },
    ]));
    const postCalls = [];
    const httpPost = async () => { postCalls.push(1); return { ok: true }; };

    const r = await publishToTelegram({
      env: ENV, outboxPath, statePath, httpPost, dryRun: true,
    });
    assert.equal(postCalls.length, 0, "dry-run não deve chamar httpPost");
    assert.equal(r.sent, 1, "dry-run ainda conta as notas processadas");
  });

  test("erro no httpPost não conta como enviado", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    writeFileSync(outboxPath, makeOutbox([
      { title: "Nota ruim", path: "ruim.md", channels: ["telegram"] },
    ]));
    const r = await publishToTelegram({
      env: ENV,
      outboxPath,
      statePath,
      httpPost: mockPost([{ ok: false, description: "Bad Request" }]),
    });
    assert.equal(r.sent, 0, "erro da API não deve contar como enviado");
  });

  test("limit restringe o número de envios e conta skipped", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    writeFileSync(outboxPath, makeOutbox([
      { title: "N1", path: "n1.md", channels: ["telegram"] },
      { title: "N2", path: "n2.md", channels: ["telegram"] },
      { title: "N3", path: "n3.md", channels: ["telegram"] },
    ]));
    const r = await publishToTelegram({
      env: ENV, outboxPath, statePath,
      httpPost: mockPost([{ ok: true }, { ok: true }]),
      limit: 2,
    });
    assert.equal(r.sent, 2);
    assert.equal(r.skipped, 1);
  });

  test("fallback legado: outbox sem deliveries ainda envia por items+channels", async () => {
    const outboxPath = join(dir, "outbox.json");
    const statePath = join(dir, "state.json");
    // Outbox legado (produtor sem channel-policy): items, sem deliveries.
    writeFileSync(outboxPath, JSON.stringify({
      schemaVersion: 1,
      items: [{ id: "leg", title: "Legado", path: "leg.md", channels: ["telegram"] }],
    }));
    const r = await publishToTelegram({
      env: ENV, outboxPath, statePath,
      httpPost: mockPost([{ ok: true, result: { message_id: 7 } }]),
    });
    assert.equal(r.sent, 1);
    assert.equal(r.skipped, 0);
    const savedLegacy = JSON.parse(readFileSync(statePath, "utf8"));
    // Legacy path: receipt itemId is the note path, status sent.
    assert.ok(savedLegacy.receipts.some((r) => r.itemId === "leg.md" && r.status === "sent"));
  });
});

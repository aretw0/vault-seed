import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inboxFromTelegram } from "./inbox_from_telegram.mjs";

const ENV = { TELEGRAM_BOT_TOKEN: "tok-test" };

function tempDir() {
  const dir = join(tmpdir(), `tg-inbox-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function mockGet(body) {
  return async (_url) => body;
}

function makeUpdate(updateId, text, date = 1700000000) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date,
      from: { id: 1, username: "testuser", first_name: "Test" },
      chat: { id: 42, type: "private", username: "testuser" },
      text,
    },
  };
}

describe("inboxFromTelegram — sem token", () => {
  test("retorna {created:0} quando token ausente", async () => {
    const r = await inboxFromTelegram({ env: {} });
    assert.deepEqual(r, { created: 0 });
  });
});

describe("inboxFromTelegram — API errors", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("retorna {created:0} quando API retorna ok=false", async () => {
    const r = await inboxFromTelegram({
      env: ENV,
      statePath: join(dir, "state.json"),
      inboxDir: join(dir, "inbox"),
      httpGet: mockGet({ ok: false, description: "Unauthorized" }),
    });
    assert.deepEqual(r, { created: 0 });
  });

  test("retorna {created:0} quando httpGet lança exceção", async () => {
    const r = await inboxFromTelegram({
      env: ENV,
      statePath: join(dir, "state.json"),
      inboxDir: join(dir, "inbox"),
      httpGet: async () => { throw new Error("network"); },
    });
    assert.deepEqual(r, { created: 0 });
  });

  test("retorna {created:0} quando não há updates", async () => {
    const r = await inboxFromTelegram({
      env: ENV,
      statePath: join(dir, "state.json"),
      inboxDir: join(dir, "inbox"),
      httpGet: mockGet({ ok: true, result: [] }),
    });
    assert.deepEqual(r, { created: 0 });
  });
});

describe("inboxFromTelegram — criação de notas", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("cria nota markdown para mensagem recebida", async () => {
    const inboxDir = join(dir, "inbox");
    const statePath = join(dir, "state.json");
    const r = await inboxFromTelegram({
      env: ENV,
      statePath,
      inboxDir,
      httpGet: mockGet({ ok: true, result: [makeUpdate(100, "Olá do Telegram")] }),
    });
    assert.equal(r.created, 1);
    const files = (await import("node:fs")).readdirSync(inboxDir);
    assert.equal(files.length, 1);
    const content = readFileSync(join(inboxDir, files[0]), "utf8");
    assert.ok(content.includes("source: telegram"), "nota deve ter source: telegram");
    assert.ok(content.includes("Olá do Telegram"), "nota deve conter o texto da mensagem");
    assert.ok(content.includes("tags: [entrada, telegram]"), "nota deve ter tags corretas");
  });

  test("persiste lastUpdateId no state após criação", async () => {
    const statePath = join(dir, "state.json");
    await inboxFromTelegram({
      env: ENV,
      statePath,
      inboxDir: join(dir, "inbox"),
      httpGet: mockGet({ ok: true, result: [makeUpdate(200, "msg")] }),
    });
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(state.lastUpdateId, 200);
  });

  test("usa lastUpdateId do state como offset na próxima chamada", async () => {
    const statePath = join(dir, "state.json");
    const inboxDir = join(dir, "inbox");
    const calls = [];
    const httpGet = async (url) => {
      calls.push(url);
      return { ok: true, result: [makeUpdate(calls.length * 100, "msg")] };
    };

    await inboxFromTelegram({ env: ENV, statePath, inboxDir, httpGet });
    await inboxFromTelegram({ env: ENV, statePath, inboxDir, httpGet });

    assert.ok(calls[1].includes("offset=101"), `segunda chamada deve usar offset=101, foi: ${calls[1]}`);
  });

  test("não sobrescreve nota existente com mesmo filename", async () => {
    const inboxDir = join(dir, "inbox");
    const statePath = join(dir, "state.json");
    const updates = { ok: true, result: [makeUpdate(300, "primeira")] };

    await inboxFromTelegram({ env: ENV, statePath, inboxDir, httpGet: mockGet(updates) });
    // força segundo run com mesmo update (state não atualiza em dry-run, mas aqui testamos diretamente)
    const stateAfter = JSON.parse(readFileSync(statePath, "utf8"));
    stateAfter.lastUpdateId = 299; // reset para reprocessar
    (await import("node:fs")).writeFileSync(statePath, JSON.stringify(stateAfter) + "\n");

    const r2 = await inboxFromTelegram({ env: ENV, statePath, inboxDir, httpGet: mockGet(updates) });
    assert.equal(r2.created, 0, "não deve contar nota que já existe");
  });

  test("dry-run não cria arquivos e não atualiza state", async () => {
    const inboxDir = join(dir, "inbox");
    const statePath = join(dir, "state.json");
    const r = await inboxFromTelegram({
      env: ENV, statePath, inboxDir, dryRun: true,
      httpGet: mockGet({ ok: true, result: [makeUpdate(400, "dry")] }),
    });
    assert.equal(r.created, 0);
    assert.ok(!existsSync(inboxDir), "dry-run não deve criar diretório de inbox");
    assert.ok(!existsSync(statePath), "dry-run não deve criar state");
  });

  test("processa channel_post além de message", async () => {
    const inboxDir = join(dir, "inbox");
    const r = await inboxFromTelegram({
      env: ENV,
      statePath: join(dir, "state.json"),
      inboxDir,
      httpGet: mockGet({
        ok: true,
        result: [{
          update_id: 500,
          channel_post: {
            message_id: 1,
            date: 1700000100,
            chat: { id: -100888, type: "channel", title: "Meu Canal" },
            text: "Post do canal",
          },
        }],
      }),
    });
    assert.equal(r.created, 1);
  });

  test("ignora updates sem message nem channel_post", async () => {
    const inboxDir = join(dir, "inbox");
    const r = await inboxFromTelegram({
      env: ENV,
      statePath: join(dir, "state.json"),
      inboxDir,
      httpGet: mockGet({
        ok: true,
        result: [{ update_id: 600, inline_query: { id: "q", from: {}, query: "" } }],
      }),
    });
    assert.equal(r.created, 0);
  });
});

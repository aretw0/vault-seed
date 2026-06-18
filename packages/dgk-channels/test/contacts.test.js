import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir, homedir } from "node:os";
import {
  resolveContactsDir,
  loadContacts,
  saveContacts,
  telegramChatsToContacts,
  discoverAndSaveTelegramContacts,
  CONTACTS_LOCATION_VAULT,
  CONTACTS_LOCATION_LOCAL,
} from "../src/contacts.js";

function tempDir() {
  const dir = join(tmpdir(), `contacts-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("resolveContactsDir", () => {
  test("vault aponta para .lab/contacts dentro do root", () => {
    const dir = resolveContactsDir("/meu/vault", { contacts: { location: "vault" } });
    assert.equal(dir, join("/meu/vault", ".lab", "contacts"));
  });

  test("local (padrão) aponta para ~/.dgk/contacts", () => {
    const dir = resolveContactsDir("/meu/vault", { contacts: { location: "local" } });
    assert.equal(dir, join(homedir(), ".dgk", "contacts"));
  });

  test("path customizado é retornado diretamente", () => {
    const custom = "/dados/compartilhados/contacts";
    const dir = resolveContactsDir("/meu/vault", { contacts: { location: custom } });
    assert.equal(dir, custom);
  });

  test("sem siloData usa local como padrão", () => {
    const dir = resolveContactsDir("/root");
    assert.ok(dir.includes(".dgk") && dir.includes("contacts"));
  });
});

describe("loadContacts / saveContacts", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("loadContacts retorna [] quando arquivo não existe", () => {
    assert.deepEqual(loadContacts("telegram", dir), []);
  });

  test("saveContacts cria arquivo e retorna contatos mesclados", () => {
    const contacts = [
      { platform: "telegram", id: "111", name: "Canal A", type: "channel", handle: "@canala" },
    ];
    const saved = saveContacts("telegram", contacts, dir);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, "111");
  });

  test("saveContacts mescla sem duplicar por id", () => {
    const c1 = [{ platform: "telegram", id: "1", name: "Alice", type: "private" }];
    const c2 = [
      { platform: "telegram", id: "1", name: "Alice Atualizada", type: "private" },
      { platform: "telegram", id: "2", name: "Bob", type: "private" },
    ];
    saveContacts("telegram", c1, dir);
    const merged = saveContacts("telegram", c2, dir);
    assert.equal(merged.length, 2, "deve ter 2 contatos únicos");
    const alice = merged.find((c) => c.id === "1");
    assert.equal(alice.name, "Alice Atualizada", "deve atualizar nome existente");
  });

  test("saveContacts ordena por nome", () => {
    const contacts = [
      { platform: "telegram", id: "3", name: "Zebra", type: "group" },
      { platform: "telegram", id: "1", name: "Alpha", type: "group" },
      { platform: "telegram", id: "2", name: "Beta", type: "group" },
    ];
    const saved = saveContacts("telegram", contacts, dir);
    assert.equal(saved[0].name, "Alpha");
    assert.equal(saved[1].name, "Beta");
    assert.equal(saved[2].name, "Zebra");
  });

  test("arquivo JSON gerado tem estrutura esperada", () => {
    saveContacts("telegram", [{ id: "1", name: "X", type: "private", platform: "telegram" }], dir);
    const raw = JSON.parse(readFileSync(join(dir, "telegram.json"), "utf8"));
    assert.equal(raw.platform, "telegram");
    assert.ok(raw.updatedAt, "deve ter updatedAt");
    assert.ok(Array.isArray(raw.contacts));
  });
});

describe("telegramChatsToContacts", () => {
  test("converte chat de canal com username", () => {
    const contacts = telegramChatsToContacts([
      { id: -100999, type: "channel", title: "Meu Canal", username: "meucanal" },
    ]);
    assert.equal(contacts[0].id, "-100999");
    assert.equal(contacts[0].name, "Meu Canal");
    assert.equal(contacts[0].handle, "@meucanal");
    assert.equal(contacts[0].platform, "telegram");
  });

  test("chat privado sem username usa first_name", () => {
    const contacts = telegramChatsToContacts([
      { id: 42, type: "private", first_name: "João" },
    ]);
    assert.equal(contacts[0].name, "João");
    assert.equal(contacts[0].handle, null);
  });
});

describe("discoverAndSaveTelegramContacts", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("retorna [] quando API falha", async () => {
    const fakeFetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
    const result = await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    assert.deepEqual(result, []);
  });

  test("retorna [] quando não há updates", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ ok: true, result: [] }) });
    const result = await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    assert.deepEqual(result, []);
  });

  test("descobre e salva chats únicos dos updates", async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        result: [
          { update_id: 1, message: { chat: { id: 111, type: "private", first_name: "Ana" } } },
          { update_id: 2, channel_post: { chat: { id: -100999, type: "channel", title: "Canal" } } },
          { update_id: 3, message: { chat: { id: 111, type: "private", first_name: "Ana" } } },
        ],
      }),
    });
    const contacts = await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    assert.equal(contacts.length, 2, "deve deduplicar por id");
  });

  test("persiste contatos no arquivo correto", async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        result: [{ update_id: 1, message: { chat: { id: 55, type: "group", title: "Grupo" } } }],
      }),
    });
    await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    const saved = loadContacts("telegram", dir);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, "55");
  });
});

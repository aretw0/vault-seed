import { describe, test, beforeEach, afterEach, expect } from "vitest";
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
    expect(dir).toBe(join("/meu/vault", ".lab", "contacts"));
  });

  test("local (padrão) aponta para ~/.dgk/contacts", () => {
    const dir = resolveContactsDir("/meu/vault", { contacts: { location: "local" } });
    expect(dir).toBe(join(homedir(), ".dgk", "contacts"));
  });

  test("path customizado é retornado diretamente", () => {
    const custom = "/dados/compartilhados/contacts";
    const dir = resolveContactsDir("/meu/vault", { contacts: { location: custom } });
    expect(dir).toBe(custom);
  });

  test("sem siloData usa local como padrão", () => {
    const dir = resolveContactsDir("/root");
    expect(dir.includes(".dgk") && dir.includes("contacts")).toBeTruthy();
  });
});

describe("loadContacts / saveContacts", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("loadContacts retorna [] quando arquivo não existe", () => {
    expect(loadContacts("telegram", dir)).toEqual([]);
  });

  test("saveContacts cria arquivo e retorna contatos mesclados", () => {
    const contacts = [
      { platform: "telegram", id: "111", name: "Canal A", type: "channel", handle: "@canala" },
    ];
    const saved = saveContacts("telegram", contacts, dir);
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe("111");
  });

  test("saveContacts mescla sem duplicar por id", () => {
    const c1 = [{ platform: "telegram", id: "1", name: "Alice", type: "private" }];
    const c2 = [
      { platform: "telegram", id: "1", name: "Alice Atualizada", type: "private" },
      { platform: "telegram", id: "2", name: "Bob", type: "private" },
    ];
    saveContacts("telegram", c1, dir);
    const merged = saveContacts("telegram", c2, dir);
    expect(merged.length, "deve ter 2 contatos únicos").toBe(2);
    const alice = merged.find((c) => c.id === "1");
    expect(alice.name, "deve atualizar nome existente").toBe("Alice Atualizada");
  });

  test("saveContacts ordena por nome", () => {
    const contacts = [
      { platform: "telegram", id: "3", name: "Zebra", type: "group" },
      { platform: "telegram", id: "1", name: "Alpha", type: "group" },
      { platform: "telegram", id: "2", name: "Beta", type: "group" },
    ];
    const saved = saveContacts("telegram", contacts, dir);
    expect(saved[0].name).toBe("Alpha");
    expect(saved[1].name).toBe("Beta");
    expect(saved[2].name).toBe("Zebra");
  });

  test("arquivo JSON gerado tem estrutura esperada", () => {
    saveContacts("telegram", [{ id: "1", name: "X", type: "private", platform: "telegram" }], dir);
    const raw = JSON.parse(readFileSync(join(dir, "telegram.json"), "utf8"));
    expect(raw.platform).toBe("telegram");
    expect(raw.updatedAt, "deve ter updatedAt").toBeTruthy();
    expect(Array.isArray(raw.contacts)).toBeTruthy();
  });
});

describe("telegramChatsToContacts", () => {
  test("converte chat de canal com username", () => {
    const contacts = telegramChatsToContacts([
      { id: -100999, type: "channel", title: "Meu Canal", username: "meucanal" },
    ]);
    expect(contacts[0].id).toBe("-100999");
    expect(contacts[0].name).toBe("Meu Canal");
    expect(contacts[0].handle).toBe("@meucanal");
    expect(contacts[0].platform).toBe("telegram");
  });

  test("chat privado sem username usa first_name", () => {
    const contacts = telegramChatsToContacts([
      { id: 42, type: "private", first_name: "João" },
    ]);
    expect(contacts[0].name).toBe("João");
    expect(contacts[0].handle).toBe(null);
  });
});

describe("discoverAndSaveTelegramContacts", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("retorna [] quando API falha", async () => {
    const fakeFetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
    const result = await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    expect(result).toEqual([]);
  });

  test("retorna [] quando não há updates", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ ok: true, result: [] }) });
    const result = await discoverAndSaveTelegramContacts("tok", dir, fakeFetch);
    expect(result).toEqual([]);
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
    expect(contacts.length, "deve deduplicar por id").toBe(2);
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
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe("55");
  });
});

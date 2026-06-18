/**
 * Platform-agnostic contact/channel topology storage.
 * Usable by vault-seed, refarm, agents-lab, or any project that manages
 * publishing channel contacts (chats, groups, lists, handles).
 * No project-specific dependencies.
 *
 * Storage location is configurable via silo data (contacts.location):
 *   "local"  — ~/.dgk/contacts/<platform>.json                  (machine-local, default)
 *   "vault"  — <vaultRoot>/.lab/contacts/<platform>.json        (in-repo, gitignored)
 *   "/path"  — absolute path prefix                             (user manages sync)
 *
 * "local" is the default — channel topology can include real chat IDs and
 * handles, so it stays out of the repo unless explicitly opted in.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const CONTACTS_LOCATION_VAULT = "vault";
export const CONTACTS_LOCATION_LOCAL = "local";

/**
 * Resolves the contacts directory from silo config.
 *
 * @param {string} vaultRoot  — absolute path to vault/project root
 * @param {object} [siloData] — already-loaded silo object { contacts?: { location } }
 * @returns {string} absolute path to the contacts directory
 */
export function resolveContactsDir(vaultRoot, siloData = {}) {
  const location = siloData?.contacts?.location ?? CONTACTS_LOCATION_LOCAL;

  if (location === CONTACTS_LOCATION_VAULT) {
    return join(vaultRoot, ".lab", "contacts");
  }
  if (location === CONTACTS_LOCATION_LOCAL) {
    return join(homedir(), ".dgk", "contacts");
  }
  return location;
}

/**
 * Loads saved contacts for a platform.
 * Returns [] if file doesn't exist or is malformed.
 *
 * @param {string} platform    — e.g. "telegram", "mastodon"
 * @param {string} contactsDir
 * @returns {object[]}
 */
export function loadContacts(platform, contactsDir) {
  const file = join(contactsDir, `${platform}.json`);
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(data.contacts) ? data.contacts : [];
  } catch {
    return [];
  }
}

/**
 * Merges new contacts into persisted storage for a platform.
 * Existing contacts are kept; new ones are added; duplicates merged by id.
 *
 * @param {string}   platform    — e.g. "telegram"
 * @param {object[]} newContacts — { id, name, type, handle?, platform, discoveredAt }
 * @param {string}   contactsDir
 * @returns {object[]} merged contact list
 */
export function saveContacts(platform, newContacts, contactsDir) {
  mkdirSync(contactsDir, { recursive: true });
  const file = join(contactsDir, `${platform}.json`);

  const existing = loadContacts(platform, contactsDir);
  const byId = new Map(existing.map((c) => [String(c.id), c]));

  for (const c of newContacts) {
    byId.set(String(c.id), { ...byId.get(String(c.id)), ...c });
  }

  const merged = [...byId.values()].sort((a, b) =>
    String(a.name ?? a.id).localeCompare(String(b.name ?? b.id), "pt"),
  );

  writeFileSync(
    file,
    JSON.stringify({ platform, updatedAt: new Date().toISOString(), contacts: merged }, null, 2) + "\n",
    "utf8",
  );

  return merged;
}

/**
 * Converts raw Telegram chat objects (from getUpdates) to canonical contact format.
 *
 * @param {object[]} chats — raw Telegram chat objects
 * @returns {object[]}
 */
export function telegramChatsToContacts(chats) {
  return chats.map((c) => ({
    platform: "telegram",
    id: String(c.id),
    name: c.title ?? c.first_name ?? c.username ?? String(c.id),
    type: c.type,
    handle: c.username ? `@${c.username}` : null,
    discoveredAt: new Date().toISOString(),
  }));
}

/**
 * Discovers Telegram chats via getUpdates and persists them to the contacts store.
 *
 * @param {string}   token        — TELEGRAM_BOT_TOKEN
 * @param {string}   contactsDir  — resolved contacts directory
 * @param {function} [fetchFn]    — injectable fetch for testing
 * @returns {object[]} saved contacts (empty array on failure)
 */
export async function discoverAndSaveTelegramContacts(token, contactsDir, fetchFn = fetch) {
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.ok) return [];

    const seen = new Map();
    for (const update of data.result ?? []) {
      const chat =
        update.message?.chat ??
        update.channel_post?.chat ??
        update.my_chat_member?.chat ??
        update.chat_member?.chat;
      if (chat && !seen.has(chat.id)) seen.set(chat.id, chat);
    }

    if (!seen.size) return [];

    const contacts = telegramChatsToContacts([...seen.values()]);
    return saveContacts("telegram", contacts, contactsDir);
  } catch {
    return [];
  }
}

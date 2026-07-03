import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { SiloCore } from '@refarm.dev/silo';

export const SILO_DIR = join(homedir(), '.dgk');
export const SILO_PATH = join(SILO_DIR, 'silo.json');

// dgk silo manages publishing-channel credentials only.
// Model/AI credentials (ANTHROPIC_API_KEY, GROQ_API_KEY, etc.) come from
// refarm sow and are injected via refarm's silo. Never add model keys here.
export const SILO_SCOPE = 'publishing-channels';
export const SILO_NAMESPACE = 'publishing';

// Only channels with a complete sow → etl → outbox cycle are listed here.
// Mastodon, Bluesky, and Buttondown have credential management ready but
// no dgk outbox implementation yet; they will be added when the cycle is complete.
export const SERVICES = {
  telegram: {
    label: 'Telegram',
    hint: 'Crie um bot em: https://t.me/BotFather → /newbot → copie o token. Depois envie qualquer mensagem ao bot para que o Chat ID seja detectado automaticamente.',
    keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    prompts: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token (de @BotFather)', secret: true },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID (canal, grupo ou @username)', secret: false },
    ],
  },
};

export function loadSilo(siloPath = SILO_PATH) {
  if (!existsSync(siloPath)) return {};
  try {
    return JSON.parse(readFileSync(siloPath, 'utf8'));
  } catch {
    return {};
  }
}

export function saveSilo(silo, siloPath = SILO_PATH) {
  const dir = dirname(siloPath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // chmod explicitly: recursive mkdir does not apply mode to pre-existing dirs
  try { chmodSync(dir, 0o700); } catch { /* no-op on Windows */ }
  writeFileSync(siloPath, JSON.stringify(silo, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  // chmod after write: mode in writeFileSync only applies on creation, not overwrite
  try { chmodSync(siloPath, 0o600); } catch { /* no-op on Windows */ }
}

export function createSiloCore(siloPath = SILO_PATH) {
  return new SiloCore({ storagePath: siloPath });
}

export async function saveTokens(tokens, siloPath = SILO_PATH, core = createSiloCore(siloPath)) {
  for (const [key, value] of Object.entries(tokens)) {
    await core.saveSecret(SILO_NAMESPACE, key, value);
  }
}

export async function removeService(serviceId, siloPath = SILO_PATH, core = createSiloCore(siloPath)) {
  const service = SERVICES[serviceId];
  if (!service) return false;
  let removed = false;
  for (const key of service.keys) {
    const result = await core.removeSecret(SILO_NAMESPACE, key);
    removed = removed || Boolean(result.removed);
  }

  const silo = loadSilo(siloPath);
  if (silo.tokens) {
    const hadLegacy = service.keys.some((k) => k in silo.tokens);
    if (hadLegacy) {
      for (const key of service.keys) delete silo.tokens[key];
      silo.updatedAt = new Date().toISOString();
      saveSilo(silo, siloPath);
      removed = true;
    }
  }
  return removed;
}

export async function loadSiloEnv(siloPath = SILO_PATH, core = createSiloCore(siloPath)) {
  const legacyTokens = loadSilo(siloPath).tokens ?? {};
  const namespacedSecrets = await core.listSecrets(SILO_NAMESPACE);
  return { ...legacyTokens, ...namespacedSecrets };
}

export async function siloStatus(siloPath = SILO_PATH, core = createSiloCore(siloPath)) {
  const tokens = await loadSiloEnv(siloPath, core);
  return Object.entries(SERVICES).map(([id, svc]) => ({
    id,
    label: svc.label,
    keys: svc.keys.map((k) => ({
      key: k,
      configured: Boolean(tokens[k]),
      preview: tokens[k] ? `${tokens[k].slice(0, 4)}${'•'.repeat(8)}` : null,
    })),
  }));
}

export async function injectSiloEnv(siloPath = SILO_PATH) {
  const env = await loadSiloEnv(siloPath);
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

// contacts.location controls where channel topology (groups, chats, lists)
// is persisted. Credentials stay in silo; topology travels separately.
// Values: "local" (default, ~/.dgk/contacts) | "vault" | absolute path
export function getContactsLocation(siloPath = SILO_PATH) {
  return loadSilo(siloPath)?.contacts?.location ?? 'local';
}

export function setContactsLocation(location, siloPath = SILO_PATH) {
  const silo = loadSilo(siloPath);
  silo.contacts = { ...(silo.contacts ?? {}), location };
  silo.updatedAt = new Date().toISOString();
  saveSilo(silo, siloPath);
}

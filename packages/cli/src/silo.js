import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const SILO_DIR = join(homedir(), '.dgk');
export const SILO_PATH = join(SILO_DIR, 'silo.json');

export const SERVICES = {
  mastodon: {
    label: 'Mastodon',
    keys: ['MASTODON_INSTANCE', 'MASTODON_TOKEN'],
    prompts: [
      { key: 'MASTODON_INSTANCE', label: 'Instância (ex: mastodon.social)', secret: false },
      { key: 'MASTODON_TOKEN', label: 'Token de acesso', secret: true },
    ],
  },
  bluesky: {
    label: 'Bluesky',
    keys: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'],
    prompts: [
      { key: 'BLUESKY_HANDLE', label: 'Handle (ex: aretw0.bsky.social)', secret: false },
      { key: 'BLUESKY_APP_PASSWORD', label: 'App Password', secret: true },
    ],
  },
  buttondown: {
    label: 'Buttondown',
    keys: ['BUTTONDOWN_API_KEY'],
    prompts: [{ key: 'BUTTONDOWN_API_KEY', label: 'API Key', secret: true }],
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

export function saveTokens(tokens, siloPath = SILO_PATH) {
  const silo = loadSilo(siloPath);
  silo.tokens = { ...(silo.tokens ?? {}), ...tokens };
  silo.updatedAt = new Date().toISOString();
  saveSilo(silo, siloPath);
}

export function removeService(serviceId, siloPath = SILO_PATH) {
  const service = SERVICES[serviceId];
  if (!service) return false;
  const silo = loadSilo(siloPath);
  if (!silo.tokens) return false;
  for (const key of service.keys) delete silo.tokens[key];
  silo.updatedAt = new Date().toISOString();
  saveSilo(silo, siloPath);
  return true;
}

export function loadSiloEnv(siloPath = SILO_PATH) {
  return loadSilo(siloPath).tokens ?? {};
}

export function siloStatus(siloPath = SILO_PATH) {
  const tokens = loadSilo(siloPath).tokens ?? {};
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

export function injectSiloEnv(siloPath = SILO_PATH) {
  const env = loadSiloEnv(siloPath);
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

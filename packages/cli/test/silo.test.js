import { describe, test, expect } from "vitest";
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSilo, saveSilo, saveTokens, removeService, loadSiloEnv, siloStatus, SERVICES } from '../src/silo.js';

function tempPath() {
  const dir = join(tmpdir(), `dgk-silo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return { dir, path: join(dir, 'silo.json'), cleanup: () => rmSync(dir, { recursive: true }) };
}

test('loadSilo retorna {} quando arquivo não existe', () => {
  expect(loadSilo('/caminho/inexistente/silo.json')).toEqual({});
});

describe('saveTokens e loadSiloEnv', () => {
  test('salva e carrega tokens corretamente no namespace publishing do refarm silo', async () => {
    const { path, cleanup } = tempPath();
    try {
      await saveTokens({ MASTODON_INSTANCE: 'fosstodon.org', MASTODON_TOKEN: 'abc123' }, path);
      const env = await loadSiloEnv(path);
      const raw = loadSilo(path);
      expect(env.MASTODON_INSTANCE).toBe('fosstodon.org');
      expect(env.MASTODON_TOKEN).toBe('abc123');
      expect(raw.tokens).toBe(undefined);
      expect(raw.secrets.publishing.MASTODON_INSTANCE.value).toBe('fosstodon.org');
      expect(raw.secrets.publishing.MASTODON_TOKEN.value).toBe('abc123');
    } finally { cleanup(); }
  });

  test('saveTokens faz merge sem apagar tokens existentes', async () => {
    const { path, cleanup } = tempPath();
    try {
      await saveTokens({ MASTODON_TOKEN: 'tok1' }, path);
      await saveTokens({ BLUESKY_HANDLE: 'user.bsky.social' }, path);
      const env = await loadSiloEnv(path);
      expect(env.MASTODON_TOKEN, 'token anterior deve permanecer').toBe('tok1');
      expect(env.BLUESKY_HANDLE, 'novo token deve estar presente').toBe('user.bsky.social');
    } finally { cleanup(); }
  });

  test('loadSiloEnv retorna {} quando silo vazio', async () => {
    const { path, cleanup } = tempPath();
    try {
      expect(await loadSiloEnv(path)).toEqual({});
    } finally { cleanup(); }
  });

  test('loadSiloEnv usa tokens legados como fallback', async () => {
    const { path, cleanup } = tempPath();
    try {
      saveSilo({ tokens: { TELEGRAM_BOT_TOKEN: 'legacy' } }, path);
      expect((await loadSiloEnv(path)).TELEGRAM_BOT_TOKEN).toBe('legacy');
    } finally { cleanup(); }
  });
});

describe('removeService', () => {
  test('remove chaves do serviço especificado sem afetar outros tokens no silo', async () => {
    const { path, cleanup } = tempPath();
    try {
      await saveTokens({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100', OTHER_KEY: 'x' }, path);
      await removeService('telegram', path);
      const env = await loadSiloEnv(path);
      expect(env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN deve ser removido').toBe(undefined);
      expect(env.TELEGRAM_CHAT_ID, 'TELEGRAM_CHAT_ID deve ser removido').toBe(undefined);
      expect(env.OTHER_KEY, 'outras chaves não devem ser afetadas').toBe('x');
    } finally { cleanup(); }
  });

  test('removeService retorna false para serviço desconhecido', async () => {
    expect(await removeService('servico-inexistente')).toBe(false);
  });

  test('removeService retorna false quando silo não existe', async () => {
    expect(await removeService('telegram', '/caminho/inexistente/silo.json')).toBe(false);
  });

  test('removeService remove tokens legados para concluir migração local', async () => {
    const { path, cleanup } = tempPath();
    try {
      saveSilo({ tokens: { TELEGRAM_BOT_TOKEN: 'legacy', TELEGRAM_CHAT_ID: '-100' } }, path);
      expect(await removeService('telegram', path)).toBe(true);
      expect(await loadSiloEnv(path)).toEqual({});
    } finally { cleanup(); }
  });
});

describe('siloStatus', () => {
  test('retorna todos os serviços registrados mesmo sem nenhum configurado', async () => {
    const { path, cleanup } = tempPath();
    try {
      const status = await siloStatus(path);
      const ids = status.map((s) => s.id);
      expect(ids.includes('telegram'), 'deve incluir telegram').toBeTruthy();
    } finally { cleanup(); }
  });

  test('marca chaves como configuradas quando presentes no silo', async () => {
    const { path, cleanup } = tempPath();
    try {
      await saveTokens({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100' }, path);
      const status = await siloStatus(path);
      const telegram = status.find((s) => s.id === 'telegram');
      expect(telegram.keys.every((k) => k.configured), 'todas as chaves telegram devem estar configuradas').toBeTruthy();
    } finally { cleanup(); }
  });

  test('preview mascara o valor (mostra apenas 4 chars)', async () => {
    const { path, cleanup } = tempPath();
    try {
      await saveTokens({ TELEGRAM_BOT_TOKEN: 'secrettoken123' }, path);
      const status = await siloStatus(path);
      const telegram = status.find((s) => s.id === 'telegram');
      const tokenKey = telegram.keys.find((k) => k.key === 'TELEGRAM_BOT_TOKEN');
      expect(tokenKey.preview.startsWith('secr'), 'preview deve começar com os 4 primeiros chars').toBeTruthy();
      expect(tokenKey.preview.includes('•'), 'preview deve conter caracteres de máscara').toBeTruthy();
    } finally { cleanup(); }
  });
});

test('SERVICES cobre somente canais com ciclo sow→etl→outbox completo', () => {
  // Only channels with a complete, dogfooded publish cycle are registered.
  expect('telegram' in SERVICES, 'telegram deve estar registrado').toBeTruthy();
  expect(!('mastodon' in SERVICES), 'mastodon ainda não tem dgk outbox implementado').toBeTruthy();
  expect(!('bluesky' in SERVICES), 'bluesky ainda não tem dgk outbox implementado').toBeTruthy();
  expect(!('buttondown' in SERVICES), 'buttondown ainda não tem dgk outbox implementado').toBeTruthy();
  expect(!('anthropic' in SERVICES), 'anthropic é domínio do refarm sow, não do dgk sow').toBeTruthy();
  expect(SERVICES.telegram.prompts.length >= 2, 'telegram precisa de BOT_TOKEN e CHAT_ID').toBeTruthy();
  for (const svc of Object.values(SERVICES)) {
    expect(typeof svc.hint === 'string' && svc.hint.length > 0, `${svc.label} deve ter hint`).toBeTruthy();
  }
});

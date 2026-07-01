import { describe, test, expect } from "vitest";
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSilo, saveTokens, removeService, loadSiloEnv, siloStatus, SERVICES } from '../src/silo.js';

function tempPath() {
  const dir = join(tmpdir(), `dgk-silo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return { dir, path: join(dir, 'silo.json'), cleanup: () => rmSync(dir, { recursive: true }) };
}

test('loadSilo retorna {} quando arquivo não existe', () => {
  expect(loadSilo('/caminho/inexistente/silo.json')).toEqual({});
});

describe('saveTokens e loadSiloEnv', () => {
  test('salva e carrega tokens corretamente', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_INSTANCE: 'fosstodon.org', MASTODON_TOKEN: 'abc123' }, path);
      expect(loadSiloEnv(path).MASTODON_INSTANCE).toBe('fosstodon.org');
      expect(loadSiloEnv(path).MASTODON_TOKEN).toBe('abc123');
    } finally { cleanup(); }
  });

  test('saveTokens faz merge sem apagar tokens existentes', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_TOKEN: 'tok1' }, path);
      saveTokens({ BLUESKY_HANDLE: 'user.bsky.social' }, path);
      const env = loadSiloEnv(path);
      expect(env.MASTODON_TOKEN, 'token anterior deve permanecer').toBe('tok1');
      expect(env.BLUESKY_HANDLE, 'novo token deve estar presente').toBe('user.bsky.social');
    } finally { cleanup(); }
  });

  test('loadSiloEnv retorna {} quando silo vazio', () => {
    const { path, cleanup } = tempPath();
    try {
      expect(loadSiloEnv(path)).toEqual({});
    } finally { cleanup(); }
  });
});

describe('removeService', () => {
  test('remove chaves do serviço especificado sem afetar outros tokens no silo', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100', OTHER_KEY: 'x' }, path);
      removeService('telegram', path);
      const env = loadSiloEnv(path);
      expect(env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN deve ser removido').toBe(undefined);
      expect(env.TELEGRAM_CHAT_ID, 'TELEGRAM_CHAT_ID deve ser removido').toBe(undefined);
      expect(env.OTHER_KEY, 'outras chaves não devem ser afetadas').toBe('x');
    } finally { cleanup(); }
  });

  test('removeService retorna false para serviço desconhecido', () => {
    expect(removeService('servico-inexistente')).toBe(false);
  });

  test('removeService retorna false quando silo não existe', () => {
    expect(removeService('telegram', '/caminho/inexistente/silo.json')).toBe(false);
  });
});

describe('siloStatus', () => {
  test('retorna todos os serviços registrados mesmo sem nenhum configurado', () => {
    const { path, cleanup } = tempPath();
    try {
      const status = siloStatus(path);
      const ids = status.map((s) => s.id);
      expect(ids.includes('telegram'), 'deve incluir telegram').toBeTruthy();
    } finally { cleanup(); }
  });

  test('marca chaves como configuradas quando presentes no silo', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100' }, path);
      const status = siloStatus(path);
      const telegram = status.find((s) => s.id === 'telegram');
      expect(telegram.keys.every((k) => k.configured), 'todas as chaves telegram devem estar configuradas').toBeTruthy();
    } finally { cleanup(); }
  });

  test('preview mascara o valor (mostra apenas 4 chars)', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ TELEGRAM_BOT_TOKEN: 'secrettoken123' }, path);
      const status = siloStatus(path);
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

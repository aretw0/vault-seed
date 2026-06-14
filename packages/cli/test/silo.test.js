import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual(loadSilo('/caminho/inexistente/silo.json'), {});
});

describe('saveTokens e loadSiloEnv', () => {
  test('salva e carrega tokens corretamente', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_INSTANCE: 'fosstodon.org', MASTODON_TOKEN: 'abc123' }, path);
      assert.equal(loadSiloEnv(path).MASTODON_INSTANCE, 'fosstodon.org');
      assert.equal(loadSiloEnv(path).MASTODON_TOKEN, 'abc123');
    } finally { cleanup(); }
  });

  test('saveTokens faz merge sem apagar tokens existentes', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_TOKEN: 'tok1' }, path);
      saveTokens({ BLUESKY_HANDLE: 'user.bsky.social' }, path);
      const env = loadSiloEnv(path);
      assert.equal(env.MASTODON_TOKEN, 'tok1', 'token anterior deve permanecer');
      assert.equal(env.BLUESKY_HANDLE, 'user.bsky.social', 'novo token deve estar presente');
    } finally { cleanup(); }
  });

  test('loadSiloEnv retorna {} quando silo vazio', () => {
    const { path, cleanup } = tempPath();
    try {
      assert.deepEqual(loadSiloEnv(path), {});
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
      assert.equal(env.TELEGRAM_BOT_TOKEN, undefined, 'TELEGRAM_BOT_TOKEN deve ser removido');
      assert.equal(env.TELEGRAM_CHAT_ID, undefined, 'TELEGRAM_CHAT_ID deve ser removido');
      assert.equal(env.OTHER_KEY, 'x', 'outras chaves não devem ser afetadas');
    } finally { cleanup(); }
  });

  test('removeService retorna false para serviço desconhecido', () => {
    assert.equal(removeService('servico-inexistente'), false);
  });

  test('removeService retorna false quando silo não existe', () => {
    assert.equal(removeService('telegram', '/caminho/inexistente/silo.json'), false);
  });
});

describe('siloStatus', () => {
  test('retorna todos os serviços registrados mesmo sem nenhum configurado', () => {
    const { path, cleanup } = tempPath();
    try {
      const status = siloStatus(path);
      const ids = status.map((s) => s.id);
      assert.ok(ids.includes('telegram'), 'deve incluir telegram');
    } finally { cleanup(); }
  });

  test('marca chaves como configuradas quando presentes no silo', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100' }, path);
      const status = siloStatus(path);
      const telegram = status.find((s) => s.id === 'telegram');
      assert.ok(telegram.keys.every((k) => k.configured), 'todas as chaves telegram devem estar configuradas');
    } finally { cleanup(); }
  });

  test('preview mascara o valor (mostra apenas 4 chars)', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ TELEGRAM_BOT_TOKEN: 'secrettoken123' }, path);
      const status = siloStatus(path);
      const telegram = status.find((s) => s.id === 'telegram');
      const tokenKey = telegram.keys.find((k) => k.key === 'TELEGRAM_BOT_TOKEN');
      assert.ok(tokenKey.preview.startsWith('secr'), 'preview deve começar com os 4 primeiros chars');
      assert.ok(tokenKey.preview.includes('•'), 'preview deve conter caracteres de máscara');
    } finally { cleanup(); }
  });
});

test('SERVICES cobre somente canais com ciclo sow→etl→outbox completo', () => {
  // Only channels with a complete, dogfooded publish cycle are registered.
  assert.ok('telegram' in SERVICES, 'telegram deve estar registrado');
  assert.ok(!('mastodon' in SERVICES), 'mastodon ainda não tem dgk outbox implementado');
  assert.ok(!('bluesky' in SERVICES), 'bluesky ainda não tem dgk outbox implementado');
  assert.ok(!('buttondown' in SERVICES), 'buttondown ainda não tem dgk outbox implementado');
  assert.ok(!('anthropic' in SERVICES), 'anthropic é domínio do refarm sow, não do dgk sow');
  assert.ok(SERVICES.telegram.prompts.length >= 2, 'telegram precisa de BOT_TOKEN e CHAT_ID');
  for (const svc of Object.values(SERVICES)) {
    assert.ok(typeof svc.hint === 'string' && svc.hint.length > 0, `${svc.label} deve ter hint`);
  }
});

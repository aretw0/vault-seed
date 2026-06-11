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
  test('remove chaves do serviço especificado sem afetar outros', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_INSTANCE: 'mastodon.social', MASTODON_TOKEN: 'tok', BLUESKY_HANDLE: 'x' }, path);
      removeService('mastodon', path);
      const env = loadSiloEnv(path);
      assert.equal(env.MASTODON_INSTANCE, undefined, 'MASTODON_INSTANCE deve ser removido');
      assert.equal(env.MASTODON_TOKEN, undefined, 'MASTODON_TOKEN deve ser removido');
      assert.equal(env.BLUESKY_HANDLE, 'x', 'BLUESKY_HANDLE não deve ser afetado');
    } finally { cleanup(); }
  });

  test('removeService retorna false para serviço desconhecido', () => {
    assert.equal(removeService('servico-inexistente'), false);
  });

  test('removeService retorna false quando silo não existe', () => {
    assert.equal(removeService('mastodon', '/caminho/inexistente/silo.json'), false);
  });
});

describe('siloStatus', () => {
  test('retorna todos os serviços mesmo sem nenhum configurado', () => {
    const { path, cleanup } = tempPath();
    try {
      const status = siloStatus(path);
      const ids = status.map((s) => s.id);
      assert.ok(ids.includes('mastodon'), 'deve incluir mastodon');
      assert.ok(ids.includes('bluesky'), 'deve incluir bluesky');
      assert.ok(ids.includes('buttondown'), 'deve incluir buttondown');
    } finally { cleanup(); }
  });

  test('marca chaves como configuradas quando presentes no silo', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_INSTANCE: 'mastodon.social', MASTODON_TOKEN: 'tok' }, path);
      const status = siloStatus(path);
      const mastodon = status.find((s) => s.id === 'mastodon');
      const bluesky = status.find((s) => s.id === 'bluesky');
      assert.ok(mastodon.keys.every((k) => k.configured), 'todas as chaves mastodon devem estar configuradas');
      assert.ok(bluesky.keys.every((k) => !k.configured), 'bluesky não deve estar configurado');
    } finally { cleanup(); }
  });

  test('preview mascara o valor (mostra apenas 4 chars)', () => {
    const { path, cleanup } = tempPath();
    try {
      saveTokens({ MASTODON_TOKEN: 'secrettoken123' }, path);
      const status = siloStatus(path);
      const mastodon = status.find((s) => s.id === 'mastodon');
      const tokenKey = mastodon.keys.find((k) => k.key === 'MASTODON_TOKEN');
      assert.ok(tokenKey.preview.startsWith('secr'), 'preview deve começar com os 4 primeiros chars');
      assert.ok(tokenKey.preview.includes('•'), 'preview deve conter caracteres de máscara');
    } finally { cleanup(); }
  });
});

test('SERVICES cobre mastodon, bluesky e buttondown com prompts corretos', () => {
  assert.ok('mastodon' in SERVICES);
  assert.ok('bluesky' in SERVICES);
  assert.ok('buttondown' in SERVICES);
  assert.ok(SERVICES.mastodon.prompts.length >= 2);
  assert.ok(SERVICES.bluesky.prompts.length >= 2);
  assert.ok(SERVICES.buttondown.prompts.length >= 1);
});

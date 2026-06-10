import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectObsidian, vaultNameFromCwd, INSTALL_HINTS } from '../src/launcher.js';

test('detectObsidian retorna null em plataforma sem paths configurados', () => {
  const result = detectObsidian('freebsd');
  assert.equal(result, null);
});

test('detectObsidian retorna null quando nenhum path existe na plataforma alvo', () => {
  // Use a real platform but with paths that won't exist in test env
  const result = detectObsidian('darwin');
  // May be null (no Obsidian installed) or { path, platform }
  if (result !== null) {
    assert.ok('path' in result, 'deve ter path');
    assert.ok('platform' in result, 'deve ter platform');
    assert.equal(result.platform, 'darwin');
    assert.ok(typeof result.path === 'string' && result.path.length > 0);
  } else {
    assert.equal(result, null);
  }
});

test('detectObsidian retorna objeto com platform correto quando instalado', () => {
  const result = detectObsidian(process.platform);
  if (result !== null) {
    assert.equal(result.platform, process.platform);
    assert.ok(typeof result.path === 'string');
  }
  // null is valid — Obsidian may not be installed in CI
});

test('vaultNameFromCwd extrai nome da pasta de um caminho absoluto', () => {
  assert.equal(vaultNameFromCwd('/home/user/vault-seed'), 'vault-seed');
  assert.equal(vaultNameFromCwd('/projects/meu-vault'), 'meu-vault');
  assert.equal(vaultNameFromCwd('C:\\Users\\user\\vault-seed'), 'vault-seed');
});

test('vaultNameFromCwd usa process.cwd quando não especificado', () => {
  const name = vaultNameFromCwd();
  assert.ok(typeof name === 'string' && name.length > 0, 'deve retornar string não vazia');
});

test('INSTALL_HINTS cobre as três plataformas principais', () => {
  assert.ok(INSTALL_HINTS.darwin, 'deve ter hint para macOS');
  assert.ok(INSTALL_HINTS.win32, 'deve ter hint para Windows');
  assert.ok(INSTALL_HINTS.linux, 'deve ter hint para Linux');
  assert.ok(INSTALL_HINTS.darwin.includes('obsidian'), 'hint macOS deve mencionar obsidian');
  assert.ok(INSTALL_HINTS.win32.includes('Obsidian'), 'hint Windows deve mencionar Obsidian');
  assert.ok(INSTALL_HINTS.linux.includes('snap') || INSTALL_HINTS.linux.includes('flatpak'));
});

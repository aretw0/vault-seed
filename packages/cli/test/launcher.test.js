import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { detectObsidian, vaultNameFromCwd, INSTALL_HINTS } from '../src/launcher.js';

// existsChecker that returns true only for a specific set of paths
function checkerFor(...existingPaths) {
  const set = new Set(existingPaths.map((p) => p.replace(/\\/g, '/')));
  return (p) => set.has(p.replace(/\\/g, '/'));
}

const neverExists = () => false;

test('detectObsidian retorna null em plataforma sem paths configurados', () => {
  assert.equal(detectObsidian('freebsd', neverExists), null);
});

test('detectObsidian retorna null quando nenhum path existe', () => {
  assert.equal(detectObsidian('darwin', neverExists), null);
  assert.equal(detectObsidian('win32', neverExists), null);
  assert.equal(detectObsidian('linux', neverExists), null);
});

test('detectObsidian encontra Obsidian no path padrão macOS', () => {
  const result = detectObsidian('darwin', checkerFor('/Applications/Obsidian.app'));
  assert.ok(result !== null);
  assert.equal(result.platform, 'darwin');
  assert.equal(result.path, '/Applications/Obsidian.app');
});

test('detectObsidian encontra Obsidian via LOCALAPPDATA no Windows', () => {
  const { LOCALAPPDATA } = process.env;
  if (!LOCALAPPDATA) return; // skip when env not set
  // join imported at top of file
  const expected = join(LOCALAPPDATA, 'Obsidian', 'Obsidian.exe');
  const result = detectObsidian('win32', checkerFor(expected));
  assert.ok(result !== null, 'deve encontrar via LOCALAPPDATA');
  assert.equal(result.platform, 'win32');
});

test('detectObsidian encontra Obsidian via Scoop no Windows', () => {
  const { USERPROFILE } = process.env;
  if (!USERPROFILE) return;
  // join imported at top of file
  const scoopPath = join(USERPROFILE, 'scoop', 'apps', 'obsidian', 'current', 'Obsidian.exe');
  const result = detectObsidian('win32', checkerFor(scoopPath));
  assert.ok(result !== null, 'deve encontrar via Scoop');
  assert.equal(result.path.toLowerCase(), scoopPath.toLowerCase());
});

test('detectObsidian encontra Obsidian via snap no Linux', () => {
  const result = detectObsidian('linux', checkerFor('/snap/bin/obsidian'));
  assert.ok(result !== null);
  assert.equal(result.path, '/snap/bin/obsidian');
});

test('detectObsidian encontra Obsidian AppImage no Linux', () => {
  const { HOME } = process.env;
  if (!HOME) return;
  const appImagePath = `${HOME}/Applications/Obsidian.AppImage`;
  const result = detectObsidian('linux', checkerFor(appImagePath));
  assert.ok(result !== null, 'deve encontrar AppImage');
  assert.equal(result.path, appImagePath);
});

test('detectObsidian retorna objeto com platform correto quando instalado (ambiente real)', () => {
  // Smoke test against real filesystem — null is valid in CI
  const result = detectObsidian(process.platform);
  if (result !== null) {
    assert.equal(result.platform, process.platform);
    assert.ok(typeof result.path === 'string');
  }
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

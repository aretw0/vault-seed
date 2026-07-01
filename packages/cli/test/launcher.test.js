import { test, expect } from "vitest";
import { join } from 'node:path';
import { detectObsidian, vaultNameFromCwd, INSTALL_HINTS, launchVault } from '../src/launcher.js';

// existsChecker that returns true only for a specific set of paths
function checkerFor(...existingPaths) {
  const set = new Set(existingPaths.map((p) => p.replace(/\\/g, '/')));
  return (p) => set.has(p.replace(/\\/g, '/'));
}

const neverExists = () => false;

test('detectObsidian retorna null em plataforma sem paths configurados', () => {
  expect(detectObsidian('freebsd', neverExists)).toBe(null);
});

test('detectObsidian retorna null quando nenhum path existe', () => {
  expect(detectObsidian('darwin', neverExists)).toBe(null);
  expect(detectObsidian('win32', neverExists)).toBe(null);
  expect(detectObsidian('linux', neverExists)).toBe(null);
});

test('detectObsidian encontra Obsidian no path padrão macOS', () => {
  const result = detectObsidian('darwin', checkerFor('/Applications/Obsidian.app'));
  expect(result !== null).toBeTruthy();
  expect(result.platform).toBe('darwin');
  expect(result.path).toBe('/Applications/Obsidian.app');
});

test('detectObsidian encontra Obsidian via LOCALAPPDATA no Windows', () => {
  const { LOCALAPPDATA } = process.env;
  if (!LOCALAPPDATA) return; // skip when env not set
  // join imported at top of file
  const expected = join(LOCALAPPDATA, 'Obsidian', 'Obsidian.exe');
  const result = detectObsidian('win32', checkerFor(expected));
  expect(result !== null, 'deve encontrar via LOCALAPPDATA').toBeTruthy();
  expect(result.platform).toBe('win32');
});

test('detectObsidian encontra Obsidian via Scoop no Windows', () => {
  const { USERPROFILE } = process.env;
  if (!USERPROFILE) return;
  // join imported at top of file
  const scoopPath = join(USERPROFILE, 'scoop', 'apps', 'obsidian', 'current', 'Obsidian.exe');
  const result = detectObsidian('win32', checkerFor(scoopPath));
  expect(result !== null, 'deve encontrar via Scoop').toBeTruthy();
  expect(result.path.toLowerCase()).toBe(scoopPath.toLowerCase());
});

test('detectObsidian encontra Obsidian via snap no Linux', () => {
  const result = detectObsidian('linux', checkerFor('/snap/bin/obsidian'));
  expect(result !== null).toBeTruthy();
  expect(result.path).toBe('/snap/bin/obsidian');
});

test('detectObsidian encontra Obsidian AppImage no Linux', () => {
  const { HOME } = process.env;
  if (!HOME) return;
  const appImagePath = `${HOME}/Applications/Obsidian.AppImage`;
  const result = detectObsidian('linux', checkerFor(appImagePath));
  expect(result !== null, 'deve encontrar AppImage').toBeTruthy();
  expect(result.path).toBe(appImagePath);
});

test('detectObsidian retorna objeto com platform correto quando instalado (ambiente real)', () => {
  // Smoke test against real filesystem — null is valid in CI
  const result = detectObsidian(process.platform);
  if (result !== null) {
    expect(result.platform).toBe(process.platform);
    expect(typeof result.path === 'string').toBeTruthy();
  }
});

test('vaultNameFromCwd extrai nome da pasta de um caminho absoluto', () => {
  expect(vaultNameFromCwd('/home/user/vault-seed')).toBe('vault-seed');
  expect(vaultNameFromCwd('/projects/meu-vault')).toBe('meu-vault');
  expect(vaultNameFromCwd('C:\\Users\\user\\vault-seed')).toBe('vault-seed');
});

test('vaultNameFromCwd usa process.cwd quando não especificado', () => {
  const name = vaultNameFromCwd();
  expect(typeof name === 'string' && name.length > 0, 'deve retornar string não vazia').toBeTruthy();
});

test('INSTALL_HINTS cobre as três plataformas principais', () => {
  expect(INSTALL_HINTS.darwin, 'deve ter hint para macOS').toBeTruthy();
  expect(INSTALL_HINTS.win32, 'deve ter hint para Windows').toBeTruthy();
  expect(INSTALL_HINTS.linux, 'deve ter hint para Linux').toBeTruthy();
  expect(INSTALL_HINTS.darwin.includes('obsidian'), 'hint macOS deve mencionar obsidian').toBeTruthy();
  expect(INSTALL_HINTS.win32.includes('Obsidian'), 'hint Windows deve mencionar Obsidian').toBeTruthy();
  expect(INSTALL_HINTS.linux.includes('snap') || INSTALL_HINTS.linux.includes('flatpak')).toBeTruthy();
});

test('launchVault monta o spec obsidian:// e desacopla via launchFn injetável', async () => {
  const calls = [];
  const fakeLaunch = (spec) => { calls.push(spec); return { unref() {} }; };
  await launchVault('meu vault', 'linux', fakeLaunch);
  expect(calls.length).toBe(1);
  expect(calls[0].command).toBe('xdg-open');
  expect(calls[0].args).toEqual(['obsidian://open?vault=meu%20vault']);
});

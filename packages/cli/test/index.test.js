import { test, expect } from "vitest";
import { resolveCommand } from '../src/index.js';

test('resolveCommand retorna o nome para comandos conhecidos', () => {
  expect(resolveCommand('validate')).toBe('validate');
  expect(resolveCommand('lint')).toBe('lint');
  expect(resolveCommand('setup')).toBe('setup');
  expect(resolveCommand('check')).toBe('check');
  expect(resolveCommand('lab')).toBe('lab');
  expect(resolveCommand('obsidian')).toBe('obsidian');
  expect(resolveCommand('note')).toBe('note');
  expect(resolveCommand('open')).toBe(null);
  expect(resolveCommand('publish')).toBe('publish');
  expect(resolveCommand('sow')).toBe('sow');
  expect(resolveCommand('etl')).toBe('etl');
  expect(resolveCommand('outbox')).toBe('outbox');
  expect(resolveCommand('inbox')).toBe('inbox');
  expect(resolveCommand('vscode')).toBe('vscode');
  expect(resolveCommand('release')).toBe(null);
});

test('resolveCommand retorna null para comandos desconhecidos', () => {
  expect(resolveCommand('unknown')).toBe(null);
  expect(resolveCommand('')).toBe(null);
  expect(resolveCommand(undefined)).toBe(null);
});

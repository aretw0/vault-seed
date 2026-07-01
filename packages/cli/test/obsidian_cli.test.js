import { test, expect } from "vitest";
import { findObsidianCli } from '../src/obsidian.js';

test('findObsidianCli retorna "obsidian" quando o probe sai com exitCode 0', async () => {
  const runProc = async (spec) => ({ exitCode: spec.command === 'obsidian' ? 0 : 1 });
  expect(await findObsidianCli(runProc)).toBe('obsidian');
});

test('findObsidianCli retorna null quando o probe rejeita (ausente)', async () => {
  const runProc = async () => { throw new Error('ENOENT'); };
  expect(await findObsidianCli(runProc)).toBe(null);
});

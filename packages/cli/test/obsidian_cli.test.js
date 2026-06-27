import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findObsidianCli } from '../src/obsidian.js';

test('findObsidianCli retorna "obsidian" quando o probe sai com exitCode 0', async () => {
  const runProc = async (spec) => ({ exitCode: spec.command === 'obsidian' ? 0 : 1 });
  assert.equal(await findObsidianCli(runProc), 'obsidian');
});

test('findObsidianCli retorna null quando o probe rejeita (ausente)', async () => {
  const runProc = async () => { throw new Error('ENOENT'); };
  assert.equal(await findObsidianCli(runProc), null);
});

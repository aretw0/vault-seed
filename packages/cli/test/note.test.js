import { test, expect } from "vitest";
import assert from "node:assert/strict";
import { note } from '../src/commands/note.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

const obsidianFound = async () => 'obsidian';
const obsidianNotFound = async () => null;

test('note passa args para obsidian quando disponível', async () => {
  const { calls, runner } = captureRun();
  await note(['search', 'query=pkm'], runner, obsidianFound);
  expect(calls).toEqual([{ cmd: 'obsidian', args: ['search', 'query=pkm'] }]);
});

test('note usa o caminho completo quando findObsidianCli retorna path absoluto', async () => {
  const { calls, runner } = captureRun();
  const fullPath = async () => '/usr/bin/obsidian';
  await note(['tags', 'total'], runner, fullPath);
  expect(calls).toEqual([{ cmd: '/usr/bin/obsidian', args: ['tags', 'total'] }]);
});

test('note falha quando Obsidian não está disponível', async () => {
  const { runner } = captureRun();
  await (async () => { let __refarmDidThrow = false; let __refarmThrown; try { await (async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await note(['search', 'query=pkm'], runner, obsidianNotFound);
      } finally {
        process.exit = origExit;
      }
    })(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.startsWith('exit:'), 'deve chamar process.exit');
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

test('note sem argumentos mostra help sem chamar runner', async () => {
  const { calls, runner } = captureRun();
  await note([], runner, obsidianFound);
  expect(calls.length, 'não deve chamar runner quando sem args (apenas help)').toBe(0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual(calls, [{ cmd: 'obsidian', args: ['search', 'query=pkm'] }]);
});

test('note usa o caminho completo quando findObsidianCli retorna path absoluto', async () => {
  const { calls, runner } = captureRun();
  const fullPath = async () => '/usr/bin/obsidian';
  await note(['tags', 'total'], runner, fullPath);
  assert.deepEqual(calls, [{ cmd: '/usr/bin/obsidian', args: ['tags', 'total'] }]);
});

test('note falha quando Obsidian não está disponível', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await note(['search', 'query=pkm'], runner, obsidianNotFound);
      } finally {
        process.exit = origExit;
      }
    },
    (err) => {
      assert.ok(err.message.startsWith('exit:'), 'deve chamar process.exit');
      return true;
    },
  );
});

test('note sem argumentos mostra help sem chamar runner', async () => {
  const { calls, runner } = captureRun();
  await note([], runner, obsidianFound);
  assert.equal(calls.length, 0, 'não deve chamar runner quando sem args (apenas help)');
});

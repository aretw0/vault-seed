import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obsidian } from '../src/commands/obsidian.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

function mockLauncher(found, launched = []) {
  return {
    detectObsidian: () => (found ? { path: '/usr/bin/obsidian', platform: 'linux' } : null),
    launchVault: async (name) => { launched.push(name); },
  };
}

test('obsidian abre vault pelo nome do cwd quando sem args', async () => {
  const launched = [];
  const { runner } = captureRun();
  await obsidian([], runner, mockLauncher(true, launched));
  assert.equal(launched.length, 1);
  assert.ok(typeof launched[0] === 'string' && launched[0].length > 0);
});

test('obsidian abre vault pelo nome passado como arg', async () => {
  const launched = [];
  const { runner } = captureRun();
  await obsidian(['meu-vault'], runner, mockLauncher(true, launched));
  assert.equal(launched[0], 'meu-vault');
});

test('obsidian falha quando Obsidian não está instalado', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await obsidian([], runner, mockLauncher(false));
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

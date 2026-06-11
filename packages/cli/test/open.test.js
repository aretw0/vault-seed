import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from '../src/commands/open.js';

const VAULT_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');

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

// --- open obsidian ---

test('open obsidian abre o vault pelo nome do cwd quando sem args', async () => {
  const launched = [];
  const { runner } = captureRun();
  await open(['obsidian'], runner, mockLauncher(true, launched));
  assert.equal(launched.length, 1);
  assert.ok(typeof launched[0] === 'string' && launched[0].length > 0);
});

test('open obsidian abre vault pelo nome passado como arg', async () => {
  const launched = [];
  const { runner } = captureRun();
  await open(['obsidian', 'meu-vault'], runner, mockLauncher(true, launched));
  assert.equal(launched[0], 'meu-vault');
});

test('open obsidian falha quando Obsidian não está instalado', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await open(['obsidian'], runner, mockLauncher(false));
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

// --- open <notebook> ---

test('open <notebook> abre pelo nome curto via marimo', async () => {
  const { calls, runner } = captureRun();
  await open(['etl-demo'], runner, undefined, VAULT_ROOT);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'uv');
  assert.ok(calls[0].args.includes('marimo'), 'deve usar marimo');
  assert.ok(calls[0].args.some((a) => a.includes('etl-demo.py')), 'deve referenciar o notebook');
});

test('open <notebook> falha quando notebook não existe', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await open(['notebook-inexistente'], runner, undefined, VAULT_ROOT);
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

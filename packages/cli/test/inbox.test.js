import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inbox } from '../src/commands/inbox.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('inbox telegram chama inbox_from_telegram.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await inbox(['telegram'], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'node');
  assert.ok(calls[0].args[0].includes('inbox_from_telegram.mjs'));
});

test('inbox telegram repassa --limit N ao script', async () => {
  const { calls, runner } = captureRun();
  await inbox(['telegram', '--limit', '10'], runner);
  const { args } = calls[0];
  assert.ok(args.includes('--limit'));
  assert.ok(args.includes('10'));
});

test('inbox com canal desconhecido chama process.exit(1)', async () => {
  const { runner } = captureRun();
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await assert.rejects(() => inbox(['nostr'], runner));
    assert.equal(exitCode, 1);
  } finally {
    process.exit = origExit;
  }
});

test('inbox sem canal imprime ajuda sem exit', async () => {
  const { calls, runner } = captureRun();
  let output = '';
  const origLog = console.log;
  console.log = (s) => { output += s; };
  try {
    await inbox([], runner);
  } finally {
    console.log = origLog;
  }
  assert.equal(calls.length, 0);
  assert.ok(output.includes('dgk inbox'));
});

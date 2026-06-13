import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outbox } from '../src/commands/outbox.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('outbox telegram chama publish_to_telegram.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram'], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'node');
  assert.ok(calls[0].args[0].includes('publish_to_telegram.mjs'));
});

test('outbox telegram repassa --dry-run ao script', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram', '--dry-run'], runner);
  assert.ok(calls[0].args.includes('--dry-run'));
});

test('outbox telegram repassa flags arbitrárias', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram', '--limit', '5'], runner);
  const { args } = calls[0];
  assert.ok(args.includes('--limit'));
  assert.ok(args.includes('5'));
});

test('outbox com canal desconhecido chama process.exit(1)', async () => {
  const { runner } = captureRun();
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await assert.rejects(() => outbox(['nostr'], runner));
    assert.equal(exitCode, 1);
  } finally {
    process.exit = origExit;
  }
});

test('outbox sem canal imprime ajuda sem exit', async () => {
  const { calls, runner } = captureRun();
  let output = '';
  const origLog = console.log;
  console.log = (s) => { output += s; };
  try {
    await outbox([], runner);
  } finally {
    console.log = origLog;
  }
  assert.equal(calls.length, 0);
  assert.ok(output.includes('dgk outbox'));
});

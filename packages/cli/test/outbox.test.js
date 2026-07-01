import { test, expect } from "vitest";
import { outbox } from '../src/commands/outbox.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('outbox telegram chama publish_to_telegram.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram'], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('node');
  expect(calls[0].args[0].includes('publish_to_telegram.mjs')).toBeTruthy();
});

test('outbox telegram repassa --dry-run ao script', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram', '--dry-run'], runner);
  expect(calls[0].args.includes('--dry-run')).toBeTruthy();
});

test('outbox telegram repassa flags arbitrárias', async () => {
  const { calls, runner } = captureRun();
  await outbox(['telegram', '--limit', '5'], runner);
  const { args } = calls[0];
  expect(args.includes('--limit')).toBeTruthy();
  expect(args.includes('5')).toBeTruthy();
});

test('outbox com canal desconhecido chama process.exit(1)', async () => {
  const { runner } = captureRun();
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await expect(() => outbox(['nostr'], runner)).rejects.toThrow();
    expect(exitCode).toBe(1);
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
  expect(calls.length).toBe(0);
  expect(output.includes('dgk outbox')).toBeTruthy();
});

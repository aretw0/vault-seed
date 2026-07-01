import { test, expect } from "vitest";
import { inbox } from '../src/commands/inbox.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('inbox telegram chama inbox_from_telegram.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await inbox(['telegram'], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('node');
  expect(calls[0].args[0].includes('inbox_from_telegram.mjs')).toBeTruthy();
});

test('inbox telegram repassa --limit N ao script', async () => {
  const { calls, runner } = captureRun();
  await inbox(['telegram', '--limit', '10'], runner);
  const { args } = calls[0];
  expect(args.includes('--limit')).toBeTruthy();
  expect(args.includes('10')).toBeTruthy();
});

test('inbox com canal desconhecido chama process.exit(1)', async () => {
  const { runner } = captureRun();
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await expect(() => inbox(['nostr'], runner)).rejects.toThrow();
    expect(exitCode).toBe(1);
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
  expect(calls.length).toBe(0);
  expect(output.includes('dgk inbox')).toBeTruthy();
});

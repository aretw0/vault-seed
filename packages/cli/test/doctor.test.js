import { test, expect } from "vitest";
import { doctor } from '../src/commands/doctor.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('doctor roda o check-substrate vendorizado via node', async () => {
  const { calls, runner } = captureRun();
  await doctor([], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('node');
  expect(calls[0].args[0].endsWith('check-substrate.mjs') && calls[0].args[0].includes('vendor'), 'deve referenciar o script vendorizado').toBeTruthy();
  expect(!calls[0].args.includes('--json')).toBeTruthy();
});

test('doctor --json passa --json ao script', async () => {
  const { calls, runner } = captureRun();
  await doctor(['--json'], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].args[0].endsWith('check-substrate.mjs') && calls[0].args[0].includes('vendor')).toBeTruthy();
  expect(calls[0].args.includes('--json')).toBeTruthy();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doctor } from '../src/commands/doctor.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('doctor roda o check-substrate vendorizado via node', async () => {
  const { calls, runner } = captureRun();
  await doctor([], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'node');
  assert.ok(calls[0].args[0].endsWith('check-substrate.mjs') && calls[0].args[0].includes('vendor'), 'deve referenciar o script vendorizado');
  assert.ok(!calls[0].args.includes('--json'));
});

test('doctor --json passa --json ao script', async () => {
  const { calls, runner } = captureRun();
  await doctor(['--json'], runner);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith('check-substrate.mjs') && calls[0].args[0].includes('vendor'));
  assert.ok(calls[0].args.includes('--json'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doctor } from '../src/commands/doctor.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('doctor roda scripts/check-substrate.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await doctor([], runner);
  assert.deepEqual(calls, [{ cmd: 'node', args: ['scripts/check-substrate.mjs'] }]);
});

test('doctor --json passa --json ao script', async () => {
  const { calls, runner } = captureRun();
  await doctor(['--json'], runner);
  assert.deepEqual(calls, [{ cmd: 'node', args: ['scripts/check-substrate.mjs', '--json'] }]);
});

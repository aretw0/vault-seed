import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/commands/validate.js';
import { lint } from '../src/commands/lint.js';
import { setup } from '../src/commands/setup.js';
import { check } from '../src/commands/check.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('validate chama pnpm run validate', async () => {
  const { calls, runner } = captureRun();
  await validate([], runner);
  assert.deepEqual(calls, [{ cmd: 'pnpm', args: ['run', 'validate'] }]);
});

test('lint chama pnpm run lint', async () => {
  const { calls, runner } = captureRun();
  await lint([], runner);
  assert.deepEqual(calls, [{ cmd: 'pnpm', args: ['run', 'lint'] }]);
});

test('setup chama bash scripts/setup.sh', async () => {
  const { calls, runner } = captureRun();
  await setup([], runner);
  assert.deepEqual(calls, [{ cmd: 'bash', args: ['scripts/setup.sh'] }]);
});

test('check chama node scripts/validate_onboarding.js', async () => {
  const { calls, runner } = captureRun();
  await check([], runner);
  assert.deepEqual(calls, [{ cmd: 'node', args: ['scripts/validate_onboarding.js'] }]);
});

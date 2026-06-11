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

test('lint chama markdownlint diretamente via node (sem pnpm)', async () => {
  const { calls, runner } = captureRun();
  await lint([], runner);
  assert.equal(calls.length, 3, 'deve chamar markdownlint 3 vezes (main, docs, templates)');
  assert.ok(calls.every((c) => c.cmd === 'node'), 'todos os calls devem usar node');
  assert.ok(
    calls.every((c) => c.args[0].includes('markdownlint')),
    'todos os calls devem referenciar markdownlint',
  );
});

test('setup chama bash scripts/setup.sh', async () => {
  const { calls, runner } = captureRun();
  await setup([], runner);
  assert.deepEqual(calls, [{ cmd: 'bash', args: ['scripts/setup.sh'] }]);
});

test('check executa onboarding, IA audit e pt-text sem pnpm', async () => {
  const { calls, runner } = captureRun();
  await check([], runner);
  assert.equal(calls.length, 3, 'deve executar 3 scripts de verificação');
  assert.ok(calls.every((c) => c.cmd === 'node'), 'todos os calls devem usar node');
  const scripts = calls.map((c) => c.args[0]);
  assert.ok(scripts.includes('scripts/validate_onboarding.js'), 'deve incluir validate_onboarding');
  assert.ok(scripts.some((s) => s.includes('audit_information_architecture')), 'deve incluir IA audit');
  assert.ok(scripts.some((s) => s.includes('check_pt_text')), 'deve incluir pt-text check');
});

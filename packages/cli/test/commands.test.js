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

test('setup não usa bash — apenas pnpm/uv via runner quando necessário', async () => {
  const { calls, runner } = captureRun();
  await setup([], runner);
  // git config and path-checks use execFileSync directly, not the injected runner
  assert.ok(calls.every((c) => c.cmd !== 'bash'), 'setup não deve chamar bash');
  assert.ok(
    calls.every((c) => c.cmd === 'pnpm' || c.cmd === 'uv'),
    'runner só deve ser chamado com pnpm ou uv',
  );
});

test('check executa onboarding, IA audit, pt-text e avaliação de texto', async () => {
  const { calls, runner } = captureRun();
  await check([], runner);
  assert.equal(calls.length, 4, 'deve executar 4 verificações');
  const nodeCalls = calls.filter((c) => c.cmd === 'node');
  assert.equal(nodeCalls.length, 3, '3 verificações usam node');
  const scripts = nodeCalls.map((c) => c.args[0]);
  assert.ok(scripts.includes('scripts/validate_onboarding.js'), 'deve incluir validate_onboarding');
  assert.ok(scripts.some((s) => s.includes('audit_information_architecture')), 'deve incluir IA audit');
  assert.ok(scripts.some((s) => s.includes('check_pt_text')), 'deve incluir pt-text check');
  const evalCall = calls.find((c) => c.cmd === 'uv');
  assert.ok(evalCall, 'deve incluir avaliação de qualidade de escrita via uv');
  assert.ok(evalCall.args.includes('--only-published'), 'check deve avaliar apenas notas publicadas');
});

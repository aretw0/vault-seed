import { test, expect } from "vitest";
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
  expect(calls).toEqual([{ cmd: 'pnpm', args: ['run', 'validate'] }]);
});

test('lint chama markdownlint diretamente via node (sem pnpm)', async () => {
  const { calls, runner } = captureRun();
  await lint([], runner);
  expect(calls.length, 'deve chamar markdownlint 3 vezes (main, docs, templates)').toBe(3);
  expect(calls.every((c) => c.cmd === 'node'), 'todos os calls devem usar node').toBeTruthy();
  expect(calls.every((c) => c.args[0].includes('markdownlint')), 'todos os calls devem referenciar markdownlint').toBeTruthy();
});

test('setup não usa bash — apenas pnpm/uv/node via runner quando necessário', async () => {
  const { calls, runner } = captureRun();
  await setup([], runner);
  // git config and path-checks use execFileSync directly, not the injected runner
  expect(calls.every((c) => c.cmd !== 'bash'), 'setup não deve chamar bash').toBeTruthy();
  expect(calls.every((c) => ['pnpm', 'uv', 'node'].includes(c.cmd)), 'runner só deve ser chamado com pnpm, uv ou node').toBeTruthy();
});

test('setup roda o diagnóstico de ambiente (check-substrate vendorizado) ao final', async () => {
  const { calls, runner } = captureRun();
  await setup([], runner);
  const doctorCall = calls.find((c) => c.cmd === 'node' && c.args[0]?.endsWith('check-substrate.mjs'));
  expect(doctorCall, 'deve rodar o check-substrate vendorizado ao final do setup').toBeTruthy();
});

test('setup não diz "completo" quando o diagnóstico de ambiente falha', async () => {
  const runner = async (cmd, args) => {
    if (cmd === 'node' && args[0]?.endsWith('check-substrate.mjs')) {
      throw new Error("check-substrate exited with code 1");
    }
  };
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    await setup([], runner);
  } finally {
    console.log = originalLog;
  }
  const joined = logs.join('\n');
  expect(!joined.includes('Setup completo'), 'não deve afirmar conclusão quando o ambiente tem pendências').toBeTruthy();
  expect(joined.includes('dgk doctor'), 'deve apontar dgk doctor para detalhar o que falta').toBeTruthy();
});

test('check executa onboarding, IA audit, pt-text, textos e apresentações', async () => {
  const { calls, runner } = captureRun();
  await check([], runner);
  expect(calls.length, 'deve executar 5 verificações').toBe(5);
  const nodeCalls = calls.filter((c) => c.cmd === 'node');
  expect(nodeCalls.length, '3 verificações usam node').toBe(3);
  const scripts = nodeCalls.map((c) => c.args[0]);
  expect(scripts.includes('scripts/validate_onboarding.js'), 'deve incluir validate_onboarding').toBeTruthy();
  expect(scripts.some((s) => s.includes('audit_information_architecture')), 'deve incluir IA audit').toBeTruthy();
  expect(scripts.some((s) => s.includes('check_pt_text')), 'deve incluir pt-text check').toBeTruthy();
  const evalCalls = calls.filter((c) => c.cmd === 'uv');
  expect(evalCalls.length, 'deve incluir avaliações de texto e apresentações via uv').toBe(2);
  expect(evalCalls.some((c) => c.args.some((a) => a.includes('avaliar_textos.py'))), 'deve avaliar textos').toBeTruthy();
  expect(evalCalls.some((c) => c.args.some((a) => a.includes('avaliar_apresentacoes.py'))), 'deve avaliar apresentações').toBeTruthy();
  expect(evalCalls.find((c) => c.args.some((a) => a.includes('avaliar_textos.py'))).args.includes('--only-published'), 'check deve avaliar apenas notas publicadas no modo rápido').toBeTruthy();
});

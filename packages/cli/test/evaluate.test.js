import { test, expect } from "vitest";
import { evaluate } from '../src/commands/evaluate.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('evaluate chama uv run python scripts/avaliar_textos.py sem args extras', async () => {
  const { calls, runner } = captureRun();
  await evaluate([], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('uv');
  expect(calls[0].args.includes('run'), 'deve incluir run').toBeTruthy();
  expect(calls[0].args.includes('python'), 'deve incluir python').toBeTruthy();
  expect(calls[0].args.some((a) => a.includes('avaliar_textos.py')), 'deve referenciar o script').toBeTruthy();
  expect(!calls[0].args.includes('--note'), 'não deve incluir --note sem arg de nota').toBeTruthy();
});

test('evaluate com caminho de nota passa --note ao script', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['40 - Recursos/Jardim digital.md'], runner);
  const { args } = calls[0];
  const noteIdx = args.indexOf('--note');
  expect(noteIdx !== -1, 'deve incluir --note').toBeTruthy();
  expect(args[noteIdx + 1]).toBe('40 - Recursos/Jardim digital.md');
});

test('evaluate com --profile passa o perfil ao script', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['--profile', 'ultra-rigor'], runner);
  const { args } = calls[0];
  const profileIdx = args.indexOf('--profile');
  expect(profileIdx !== -1, 'deve incluir --profile').toBeTruthy();
  expect(args[profileIdx + 1]).toBe('ultra-rigor');
});

test('evaluate repassa --only-published e --strict ao avaliador de textos', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['--only-published', '--strict'], runner);
  const { args } = calls[0];
  expect(args.includes('--only-published'), 'deve repassar --only-published').toBeTruthy();
  expect(args.includes('--strict'), 'deve repassar --strict').toBeTruthy();
});

test('evaluate --presentations usa avaliador de apresentações', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['--presentations'], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('uv');
  expect(calls[0].args.some((a) => a.includes('avaliar_apresentacoes.py')), 'deve referenciar apresentações').toBeTruthy();
  expect(!calls[0].args.includes('--note'), 'apresentações não devem receber --note').toBeTruthy();
});

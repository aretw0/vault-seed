import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/commands/evaluate.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('evaluate chama uv run python scripts/avaliar_textos.py sem args extras', async () => {
  const { calls, runner } = captureRun();
  await evaluate([], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'uv');
  assert.ok(calls[0].args.includes('run'), 'deve incluir run');
  assert.ok(calls[0].args.includes('python'), 'deve incluir python');
  assert.ok(calls[0].args.some((a) => a.includes('avaliar_textos.py')), 'deve referenciar o script');
  assert.ok(!calls[0].args.includes('--note'), 'não deve incluir --note sem arg de nota');
});

test('evaluate com caminho de nota passa --note ao script', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['40 - Recursos/Jardim digital.md'], runner);
  const { args } = calls[0];
  const noteIdx = args.indexOf('--note');
  assert.ok(noteIdx !== -1, 'deve incluir --note');
  assert.equal(args[noteIdx + 1], '40 - Recursos/Jardim digital.md');
});

test('evaluate com --profile passa o perfil ao script', async () => {
  const { calls, runner } = captureRun();
  await evaluate(['--profile', 'ultra-rigor'], runner);
  const { args } = calls[0];
  const profileIdx = args.indexOf('--profile');
  assert.ok(profileIdx !== -1, 'deve incluir --profile');
  assert.equal(args[profileIdx + 1], 'ultra-rigor');
});

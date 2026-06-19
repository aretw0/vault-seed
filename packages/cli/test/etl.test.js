import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etl } from '../src/commands/etl.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('etl chama os 4 scripts do pipeline via node em sequência', async () => {
  const { calls, runner } = captureRun();
  await etl([], runner);
  assert.equal(calls.length, 4, 'deve chamar 4 scripts');
  assert.ok(calls.every((c) => c.cmd === 'node'), 'todos devem usar node');
  const scripts = calls.map((c) => c.args[0]);
  assert.ok(scripts.includes('scripts/lab_etl_demo.mjs'));
  assert.ok(scripts.includes('scripts/prepare_feed_sources.mjs'));
  assert.ok(scripts.includes('scripts/prepare_publication_outbox.mjs'));
  assert.ok(scripts.includes('scripts/prepare_lab_datasets.mjs'));
});

test('etl respeita a ordem dos scripts', async () => {
  const { calls, runner } = captureRun();
  await etl([], runner);
  assert.ok(calls[0].args[0].includes('lab_etl_demo'), 'etl_demo deve ser primeiro');
  assert.ok(calls[3].args[0].includes('prepare_lab_datasets'), 'datasets deve ser último');
});

test('etl com --help imprime ajuda sem chamar scripts', async () => {
  const { calls, runner } = captureRun();
  let output = '';
  const origLog = console.log;
  console.log = (s) => { output += s; };
  try {
    await etl(['--help'], runner);
  } finally {
    console.log = origLog;
  }
  assert.equal(calls.length, 0, 'não deve chamar scripts');
  assert.ok(output.includes('dgk etl'), 'deve imprimir ajuda');
});

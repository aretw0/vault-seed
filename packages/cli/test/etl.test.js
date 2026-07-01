import { test, expect } from "vitest";
import { etl } from '../src/commands/etl.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

test('etl chama os 4 scripts do pipeline via node em sequência', async () => {
  const { calls, runner } = captureRun();
  await etl([], runner);
  expect(calls.length, 'deve chamar 4 scripts').toBe(4);
  expect(calls.every((c) => c.cmd === 'node'), 'todos devem usar node').toBeTruthy();
  const scripts = calls.map((c) => c.args[0]);
  expect(scripts.includes('scripts/lab_etl_demo.mjs')).toBeTruthy();
  expect(scripts.includes('scripts/prepare_feed_sources.mjs')).toBeTruthy();
  expect(scripts.includes('scripts/prepare_publication_outbox.mjs')).toBeTruthy();
  expect(scripts.includes('scripts/prepare_lab_datasets.mjs')).toBeTruthy();
});

test('etl respeita a ordem dos scripts', async () => {
  const { calls, runner } = captureRun();
  await etl([], runner);
  expect(calls[0].args[0].includes('lab_etl_demo'), 'etl_demo deve ser primeiro').toBeTruthy();
  expect(calls[3].args[0].includes('prepare_lab_datasets'), 'datasets deve ser último').toBeTruthy();
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
  expect(calls.length, 'não deve chamar scripts').toBe(0);
  expect(output.includes('dgk etl'), 'deve imprimir ajuda').toBeTruthy();
});

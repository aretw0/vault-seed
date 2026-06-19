import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preview, parsePreviewArgs } from '../src/commands/preview.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

// --- parsePreviewArgs ---

test('parsePreviewArgs defaults: port 4321, sem lab, sem network', () => {
  const result = parsePreviewArgs([]);
  assert.equal(result.port, '4321');
  assert.equal(result.withLab, false);
  assert.equal(result.withNetwork, false);
});

test('parsePreviewArgs --lab ativa withLab', () => {
  const { withLab } = parsePreviewArgs(['--lab']);
  assert.equal(withLab, true);
});

test('parsePreviewArgs --network ativa withNetwork', () => {
  const { withNetwork } = parsePreviewArgs(['--network']);
  assert.equal(withNetwork, true);
});

test('parsePreviewArgs --host é alias de --network', () => {
  const { withNetwork } = parsePreviewArgs(['--host']);
  assert.equal(withNetwork, true);
});

test('parsePreviewArgs --port N respeita porta customizada', () => {
  const { port } = parsePreviewArgs(['--port', '5000']);
  assert.equal(port, '5000');
});

// --- preview pipeline ---

test('preview sem flags chama pnpm astro dev na porta padrão', async () => {
  const { calls, runner } = captureRun();
  await preview([], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'pnpm');
  assert.ok(calls[0].args.includes('dev'), 'deve incluir dev');
  assert.ok(calls[0].args.includes('4321'), 'deve usar porta 4321');
  assert.ok(!calls[0].args.includes('--host'), 'não deve expor na rede');
});

test('preview --lab exporta notebooks antes do dev', async () => {
  const { calls, runner } = captureRun();
  await preview(['--lab'], runner);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].cmd, 'node');
  assert.ok(calls[0].args.some((a) => a.includes('export_notebooks')), 'primeiro: exportar notebooks');
  assert.equal(calls[1].cmd, 'pnpm');
  assert.ok(calls[1].args.includes('dev'), 'segundo: astro dev');
});

test('preview --network adiciona --host 0.0.0.0', async () => {
  const { calls, runner } = captureRun();
  await preview(['--network'], runner);
  const astroCall = calls[0];
  const hostIdx = astroCall.args.indexOf('--host');
  assert.ok(hostIdx !== -1, 'deve ter --host');
  assert.equal(astroCall.args[hostIdx + 1], '0.0.0.0');
});

test('preview --lab --network combina export + host', async () => {
  const { calls, runner } = captureRun();
  await preview(['--lab', '--network'], runner);
  assert.equal(calls.length, 2, 'export + dev');
  const astroCall = calls[1];
  assert.ok(astroCall.args.includes('--host'), 'deve ter --host');
});

test('preview --port N usa porta customizada', async () => {
  const { calls, runner } = captureRun();
  await preview(['--port', '8080'], runner);
  const astroCall = calls[0];
  const portIdx = astroCall.args.indexOf('--port');
  assert.ok(portIdx !== -1, 'deve ter --port');
  assert.equal(astroCall.args[portIdx + 1], '8080');
});

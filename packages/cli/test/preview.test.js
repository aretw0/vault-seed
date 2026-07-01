import { test, expect } from "vitest";
import { preview, parsePreviewArgs } from '../src/commands/preview.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

// --- parsePreviewArgs ---

test('parsePreviewArgs defaults: port 4321, sem lab, sem network', () => {
  const result = parsePreviewArgs([]);
  expect(result.port).toBe('4321');
  expect(result.withLab).toBe(false);
  expect(result.withNetwork).toBe(false);
});

test('parsePreviewArgs --lab ativa withLab', () => {
  const { withLab } = parsePreviewArgs(['--lab']);
  expect(withLab).toBe(true);
});

test('parsePreviewArgs --network ativa withNetwork', () => {
  const { withNetwork } = parsePreviewArgs(['--network']);
  expect(withNetwork).toBe(true);
});

test('parsePreviewArgs --host é alias de --network', () => {
  const { withNetwork } = parsePreviewArgs(['--host']);
  expect(withNetwork).toBe(true);
});

test('parsePreviewArgs --port N respeita porta customizada', () => {
  const { port } = parsePreviewArgs(['--port', '5000']);
  expect(port).toBe('5000');
});

// --- preview pipeline ---

test('preview sem flags chama pnpm astro dev na porta padrão', async () => {
  const { calls, runner } = captureRun();
  await preview([], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('pnpm');
  expect(calls[0].args.includes('dev'), 'deve incluir dev').toBeTruthy();
  expect(calls[0].args.includes('4321'), 'deve usar porta 4321').toBeTruthy();
  expect(!calls[0].args.includes('--host'), 'não deve expor na rede').toBeTruthy();
});

test('preview --lab exporta notebooks antes do dev', async () => {
  const { calls, runner } = captureRun();
  await preview(['--lab'], runner);
  expect(calls.length).toBe(2);
  expect(calls[0].cmd).toBe('node');
  expect(calls[0].args.some((a) => a.includes('export_notebooks')), 'primeiro: exportar notebooks').toBeTruthy();
  expect(calls[1].cmd).toBe('pnpm');
  expect(calls[1].args.includes('dev'), 'segundo: astro dev').toBeTruthy();
});

test('preview --network adiciona --host 0.0.0.0', async () => {
  const { calls, runner } = captureRun();
  await preview(['--network'], runner);
  const astroCall = calls[0];
  const hostIdx = astroCall.args.indexOf('--host');
  expect(hostIdx !== -1, 'deve ter --host').toBeTruthy();
  expect(astroCall.args[hostIdx + 1]).toBe('0.0.0.0');
});

test('preview --lab --network combina export + host', async () => {
  const { calls, runner } = captureRun();
  await preview(['--lab', '--network'], runner);
  expect(calls.length, 'export + dev').toBe(2);
  const astroCall = calls[1];
  expect(astroCall.args.includes('--host'), 'deve ter --host').toBeTruthy();
});

test('preview --port N usa porta customizada', async () => {
  const { calls, runner } = captureRun();
  await preview(['--port', '8080'], runner);
  const astroCall = calls[0];
  const portIdx = astroCall.args.indexOf('--port');
  expect(portIdx !== -1, 'deve ter --port').toBeTruthy();
  expect(astroCall.args[portIdx + 1]).toBe('8080');
});

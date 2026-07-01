import { test, expect } from "vitest";
import assert from "node:assert/strict";
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lab, listNotebooks, resolveNotebook } from '../src/commands/lab.js';

// Vault root is two levels up from packages/cli/
const VAULT_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

// --- listNotebooks ---

test('listNotebooks retorna array vazio quando diretório não existe', () => {
  const result = listNotebooks('/caminho/inexistente');
  expect(result).toEqual([]);
});

test('listNotebooks exclui _lab_notebook_runtime.py', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  const names = notebooks.map((n) => n.name);
  expect(!names.includes('_lab_notebook_runtime'), 'runtime helper não deve aparecer na lista').toBeTruthy();
});

test('listNotebooks inclui notebooks conhecidos', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  const names = notebooks.map((n) => n.name);
  for (const expected of ['analise-feeds', 'analise-outbox', 'etl-demo']) {
    expect(names.includes(expected), `${expected} deve estar na lista`).toBeTruthy();
  }
});

test('listNotebooks retorna objetos com name e path', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  if (notebooks.length > 0) {
    const first = notebooks[0];
    expect('name' in first, 'deve ter name').toBeTruthy();
    expect('path' in first, 'deve ter path').toBeTruthy();
    expect(first.path.endsWith('.py'), 'path deve terminar em .py').toBeTruthy();
  }
});

// --- resolveNotebook ---

test('resolveNotebook resolve nome exato', () => {
  const path = resolveNotebook('analise-feeds', VAULT_ROOT);
  expect(path !== null, 'deve resolver analise-feeds').toBeTruthy();
  expect(path.endsWith('analise-feeds.py')).toBeTruthy();
});

test('resolveNotebook resolve nome parcial único', () => {
  const path = resolveNotebook('leitura', VAULT_ROOT);
  expect(path !== null, 'deve resolver analise-leitura via parcial').toBeTruthy();
});

test('resolveNotebook retorna null para nome desconhecido', () => {
  const path = resolveNotebook('notebook-que-nao-existe', VAULT_ROOT);
  expect(path).toBe(null);
});

// --- lab pipeline subcommands ---

test('lab export chama export_notebooks.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await lab(['export'], runner);
  expect(calls).toEqual([{ cmd: 'node', args: ['scripts/export_notebooks.mjs'] }]);
});

test('lab curate chama uv run com anthropic e defusedxml', async () => {
  const { calls, runner } = captureRun();
  await lab(['curate'], runner);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('uv');
  expect(calls[0].args.includes('anthropic'), 'deve incluir anthropic').toBeTruthy();
  expect(calls[0].args.includes('defusedxml'), 'deve incluir defusedxml').toBeTruthy();
  expect(calls[0].args.some((a) => a.includes('curate_feeds_ia.py')), 'deve referenciar o script').toBeTruthy();
});

// --- lab <notebook> como ação primária ---

test('lab <nome-curto> abre notebook pelo nome via marimo', async () => {
  const { calls, runner } = captureRun();
  await lab(['etl-demo'], runner, VAULT_ROOT);
  expect(calls.length).toBe(1);
  expect(calls[0].cmd).toBe('uv');
  expect(calls[0].args.includes('marimo'), 'deve usar marimo').toBeTruthy();
  expect(calls[0].args.some((a) => a.includes('etl-demo.py')), 'deve referenciar o notebook').toBeTruthy();
});

// Contrato: a invocação de marimo deve ser auto-suficiente em ambiente limpo.
// Sem --with marimo, `uv run marimo edit` falha quando marimo não está em
// pyproject.toml — o usuário vê "Failed to spawn: marimo / program not found".
test('lab <notebook> usa --with marimo para não depender de uv sync prévio', async () => {
  const { calls, runner } = captureRun();
  await lab(['etl-demo'], runner, VAULT_ROOT);
  const { args } = calls[0];
  const withIdx = args.indexOf('--with');
  expect(withIdx !== -1, 'deve ter --with').toBeTruthy();
  expect(args[withIdx + 1], '--with deve ser seguido de marimo').toBe('marimo');
});

test('lab <nome-parcial> resolve por match único', async () => {
  const { calls, runner } = captureRun();
  await lab(['leitura'], runner, VAULT_ROOT);
  expect(calls[0].cmd).toBe('uv');
  expect(calls[0].args.some((a) => a.includes('leitura.py'))).toBeTruthy();
});

test('lab <nome-inexistente> chama process.exit', async () => {
  const { runner } = captureRun();
  await (async () => { let __refarmDidThrow = false; let __refarmThrown; try { await (async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await lab(['notebook-que-nao-existe'], runner, VAULT_ROOT);
      } finally {
        process.exit = origExit;
      }
    })(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.startsWith('exit:'));
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual(result, []);
});

test('listNotebooks exclui _lab_notebook_runtime.py', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  const names = notebooks.map((n) => n.name);
  assert.ok(!names.includes('_lab_notebook_runtime'), 'runtime helper não deve aparecer na lista');
});

test('listNotebooks inclui notebooks conhecidos', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  const names = notebooks.map((n) => n.name);
  for (const expected of ['analise-feeds', 'analise-outbox', 'etl-demo']) {
    assert.ok(names.includes(expected), `${expected} deve estar na lista`);
  }
});

test('listNotebooks retorna objetos com name e path', () => {
  const notebooks = listNotebooks(VAULT_ROOT);
  if (notebooks.length > 0) {
    const first = notebooks[0];
    assert.ok('name' in first, 'deve ter name');
    assert.ok('path' in first, 'deve ter path');
    assert.ok(first.path.endsWith('.py'), 'path deve terminar em .py');
  }
});

// --- resolveNotebook ---

test('resolveNotebook resolve nome exato', () => {
  const path = resolveNotebook('analise-feeds', VAULT_ROOT);
  assert.ok(path !== null, 'deve resolver analise-feeds');
  assert.ok(path.endsWith('analise-feeds.py'));
});

test('resolveNotebook resolve nome parcial único', () => {
  const path = resolveNotebook('leitura', VAULT_ROOT);
  assert.ok(path !== null, 'deve resolver analise-leitura via parcial');
});

test('resolveNotebook retorna null para nome desconhecido', () => {
  const path = resolveNotebook('notebook-que-nao-existe', VAULT_ROOT);
  assert.equal(path, null);
});

// --- lab pipeline subcommands ---

test('lab etl chama os 4 scripts do pipeline via node', async () => {
  const { calls, runner } = captureRun();
  await lab(['etl'], runner);
  assert.equal(calls.length, 4, 'deve chamar 4 scripts em sequência');
  assert.ok(calls.every((c) => c.cmd === 'node'), 'todos os calls devem usar node');
  const scripts = calls.map((c) => c.args[0]);
  assert.ok(scripts.includes('scripts/lab_etl_demo.mjs'), 'deve incluir lab_etl_demo');
  assert.ok(scripts.includes('scripts/prepare_lab_datasets.mjs'), 'deve incluir prepare_lab_datasets');
});

test('lab export chama export_notebooks.mjs via node', async () => {
  const { calls, runner } = captureRun();
  await lab(['export'], runner);
  assert.deepEqual(calls, [{ cmd: 'node', args: ['scripts/export_notebooks.mjs'] }]);
});

test('lab curate chama uv run com anthropic e defusedxml', async () => {
  const { calls, runner } = captureRun();
  await lab(['curate'], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'uv');
  assert.ok(calls[0].args.includes('anthropic'), 'deve incluir anthropic');
  assert.ok(calls[0].args.includes('defusedxml'), 'deve incluir defusedxml');
  assert.ok(calls[0].args.some((a) => a.includes('curate_feeds_ia.py')), 'deve referenciar o script');
});

test('lab evaluate chama uv run python scripts/avaliar_textos.py sem args extras', async () => {
  const { calls, runner } = captureRun();
  await lab(['evaluate'], runner);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'uv');
  assert.ok(calls[0].args.includes('run'), 'deve incluir run');
  assert.ok(calls[0].args.includes('python'), 'deve incluir python');
  assert.ok(calls[0].args.some((a) => a.includes('avaliar_textos.py')), 'deve referenciar o script');
  assert.ok(!calls[0].args.includes('--note'), 'não deve incluir --note sem arg de nota');
});

test('lab evaluate com caminho de nota passa --note ao script', async () => {
  const { calls, runner } = captureRun();
  await lab(['evaluate', '40 - Recursos/Jardim digital.md'], runner);
  const { args } = calls[0];
  const noteIdx = args.indexOf('--note');
  assert.ok(noteIdx !== -1, 'deve incluir --note');
  assert.equal(args[noteIdx + 1], '40 - Recursos/Jardim digital.md');
});

test('lab evaluate com --profile passa o perfil ao script', async () => {
  const { calls, runner } = captureRun();
  await lab(['evaluate', '--profile', 'ultra-rigor'], runner);
  const { args } = calls[0];
  const profileIdx = args.indexOf('--profile');
  assert.ok(profileIdx !== -1, 'deve incluir --profile');
  assert.equal(args[profileIdx + 1], 'ultra-rigor');
});

test('lab rejeita subcomandos removidos (open, note, list, open-vault)', async () => {
  for (const removed of ['open', 'note', 'list', 'open-vault']) {
    const { runner } = captureRun();
    await assert.rejects(
      async () => {
        const origExit = process.exit;
        process.exit = (code) => { throw new Error(`exit:${code}`); };
        try {
          await lab([removed], runner);
        } finally {
          process.exit = origExit;
        }
      },
      (err) => {
        assert.ok(err.message.startsWith('exit:'), `lab ${removed} deve chamar process.exit`);
        return true;
      },
    );
  }
});

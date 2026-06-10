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

const obsidianFound = async () => 'obsidian';
const obsidianNotFound = async () => null;

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

// --- lab subcommands ---

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

test('lab list não chama runner (apenas imprime)', async () => {
  const { calls, runner } = captureRun();
  await lab(['list'], runner, undefined, undefined, VAULT_ROOT);
  assert.equal(calls.length, 0);
});

test('lab open abre notebook pelo nome curto', async () => {
  const { calls, runner } = captureRun();
  await lab(['open', 'etl-demo'], runner, undefined, undefined, VAULT_ROOT);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'uv');
  assert.ok(calls[0].args.includes('marimo'), 'deve usar marimo');
  assert.ok(calls[0].args.some((a) => a.includes('etl-demo.py')), 'deve referenciar o notebook');
});

test('lab note passa args para obsidian quando disponível', async () => {
  const { calls, runner } = captureRun();
  await lab(['note', 'search', 'query=pkm'], runner, obsidianFound);
  assert.deepEqual(calls, [{ cmd: 'obsidian', args: ['search', 'query=pkm'] }]);
});

test('lab note usa o caminho completo quando findObsidianCli retorna path absoluto', async () => {
  const { calls, runner } = captureRun();
  const fullPath = async () => '/usr/bin/obsidian';
  await lab(['note', 'tags', 'total'], runner, fullPath);
  assert.deepEqual(calls, [{ cmd: '/usr/bin/obsidian', args: ['tags', 'total'] }]);
});

test('lab note falha quando Obsidian não está disponível', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      // Intercept process.exit to throw instead
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await lab(['note', 'search', 'query=pkm'], runner, obsidianNotFound);
      } finally {
        process.exit = origExit;
      }
    },
    (err) => {
      assert.ok(err.message.startsWith('exit:'), 'deve chamar process.exit');
      return true;
    },
  );
});

// --- lab open-vault ---

function mockLauncher(found, launched = []) {
  return {
    detectObsidian: () => (found ? { path: '/usr/bin/obsidian', platform: 'linux' } : null),
    launchVault: async (name) => { launched.push(name); },
  };
}

test('lab open-vault abre o vault pelo nome do cwd quando sem args', async () => {
  const launched = [];
  const { runner } = captureRun();
  await lab(['open-vault'], runner, undefined, mockLauncher(true, launched));
  assert.equal(launched.length, 1);
  assert.ok(typeof launched[0] === 'string' && launched[0].length > 0);
});

test('lab open-vault abre o vault pelo nome passado como arg', async () => {
  const launched = [];
  const { runner } = captureRun();
  await lab(['open-vault', 'meu-vault'], runner, undefined, mockLauncher(true, launched));
  assert.equal(launched[0], 'meu-vault');
});

test('lab open-vault falha quando Obsidian não está instalado', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await lab(['open-vault'], runner, undefined, mockLauncher(false));
      } finally {
        process.exit = origExit;
      }
    },
    (err) => {
      assert.ok(err.message.startsWith('exit:'), 'deve chamar process.exit');
      return true;
    },
  );
});

test('lab note falha sem argumentos mesmo com Obsidian disponível', async () => {
  const { runner } = captureRun();
  await assert.rejects(
    async () => {
      const origExit = process.exit;
      process.exit = (code) => { throw new Error(`exit:${code}`); };
      try {
        await lab(['note'], runner, obsidianFound);
      } finally {
        process.exit = origExit;
      }
    },
    (err) => {
      assert.ok(err.message.startsWith('exit:'));
      return true;
    },
  );
});

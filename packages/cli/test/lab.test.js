import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lab, listNotebooks, resolveNotebook } from '../src/commands/lab.js';

function captureRun() {
  const calls = [];
  const runner = async (cmd, args) => { calls.push({ cmd, args }); };
  return { calls, runner };
}

const obsidianFound = async () => true;
const obsidianNotFound = async () => false;

// --- listNotebooks ---

test('listNotebooks retorna array vazio quando diretório não existe', () => {
  const result = listNotebooks('/caminho/inexistente');
  assert.deepEqual(result, []);
});

test('listNotebooks exclui _lab_notebook_runtime.py', () => {
  const notebooks = listNotebooks(process.cwd());
  const names = notebooks.map((n) => n.name);
  assert.ok(!names.includes('_lab_notebook_runtime'), 'runtime helper não deve aparecer na lista');
});

test('listNotebooks inclui notebooks conhecidos', () => {
  const notebooks = listNotebooks(process.cwd());
  const names = notebooks.map((n) => n.name);
  for (const expected of ['analise-feeds', 'analise-outbox', 'etl-demo']) {
    assert.ok(names.includes(expected), `${expected} deve estar na lista`);
  }
});

test('listNotebooks retorna objetos com name e path', () => {
  const notebooks = listNotebooks(process.cwd());
  if (notebooks.length > 0) {
    const first = notebooks[0];
    assert.ok('name' in first, 'deve ter name');
    assert.ok('path' in first, 'deve ter path');
    assert.ok(first.path.endsWith('.py'), 'path deve terminar em .py');
  }
});

// --- resolveNotebook ---

test('resolveNotebook resolve nome exato', () => {
  const path = resolveNotebook('analise-feeds', process.cwd());
  assert.ok(path !== null, 'deve resolver analise-feeds');
  assert.ok(path.endsWith('analise-feeds.py'));
});

test('resolveNotebook resolve nome parcial único', () => {
  const path = resolveNotebook('leitura', process.cwd());
  assert.ok(path !== null, 'deve resolver analise-leitura via parcial');
});

test('resolveNotebook retorna null para nome desconhecido', () => {
  const path = resolveNotebook('notebook-que-nao-existe', process.cwd());
  assert.equal(path, null);
});

// --- lab subcommands ---

test('lab etl chama pnpm run notebooks:etl', async () => {
  const { calls, runner } = captureRun();
  await lab(['etl'], runner);
  assert.deepEqual(calls, [{ cmd: 'pnpm', args: ['run', 'notebooks:etl'] }]);
});

test('lab export chama pnpm run notebooks:export', async () => {
  const { calls, runner } = captureRun();
  await lab(['export'], runner);
  assert.deepEqual(calls, [{ cmd: 'pnpm', args: ['run', 'notebooks:export'] }]);
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
  await lab(['list'], runner);
  assert.equal(calls.length, 0);
});

test('lab open abre notebook pelo nome curto', async () => {
  const { calls, runner } = captureRun();
  await lab(['open', 'etl-demo'], runner);
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

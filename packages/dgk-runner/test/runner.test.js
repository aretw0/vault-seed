import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/index.js';

test('run resolve quando processo sai com código 0', async () => {
  await assert.doesNotReject(() => run('node', ['--version']));
});

test('run rejeita quando processo sai com código não-zero', async () => {
  await assert.rejects(
    () => run('node', ['-e', 'process.exit(2)']),
    (err) => {
      assert.ok(err.message.includes('exited with code 2'), `mensagem inesperada: ${err.message}`);
      return true;
    },
  );
});

test('run rejeita com mensagem contendo cmd e args', async () => {
  await assert.rejects(
    () => run('node', ['-e', 'process.exit(1)']),
    (err) => {
      assert.ok(err.message.includes('node'), 'deve incluir o comando');
      return true;
    },
  );
});

test('run rejeita quando o comando não existe', async () => {
  await assert.rejects(() => run('comando-que-nao-existe-dgk', []));
});

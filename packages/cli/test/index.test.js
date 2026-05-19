import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCommand } from '../src/index.js';

test('resolveCommand retorna o nome para comandos conhecidos', () => {
  assert.equal(resolveCommand('validate'), 'validate');
  assert.equal(resolveCommand('lint'), 'lint');
  assert.equal(resolveCommand('setup'), 'setup');
  assert.equal(resolveCommand('release'), 'release');
  assert.equal(resolveCommand('check'), 'check');
});

test('resolveCommand retorna null para comandos desconhecidos', () => {
  assert.equal(resolveCommand('unknown'), null);
  assert.equal(resolveCommand(''), null);
  assert.equal(resolveCommand(undefined), null);
});

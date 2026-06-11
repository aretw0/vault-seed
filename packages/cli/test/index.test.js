import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCommand } from '../src/index.js';

test('resolveCommand retorna o nome para comandos conhecidos', () => {
  assert.equal(resolveCommand('validate'), 'validate');
  assert.equal(resolveCommand('lint'), 'lint');
  assert.equal(resolveCommand('setup'), 'setup');
  assert.equal(resolveCommand('check'), 'check');
  assert.equal(resolveCommand('lab'), 'lab');
  assert.equal(resolveCommand('open'), 'open');
  assert.equal(resolveCommand('note'), 'note');
  assert.equal(resolveCommand('publish'), 'publish');
  assert.equal(resolveCommand('sow'), 'sow');
  assert.equal(resolveCommand('release'), null);
});

test('resolveCommand retorna null para comandos desconhecidos', () => {
  assert.equal(resolveCommand('unknown'), null);
  assert.equal(resolveCommand(''), null);
  assert.equal(resolveCommand(undefined), null);
});

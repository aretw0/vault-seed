import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasTool } from '../src/commands/setup.js';

test('hasTool true quando runSync retorna exitCode 0', () => {
  assert.equal(hasTool('uv', () => ({ exitCode: 0 })), true);
});

test('hasTool false quando runSync retorna exitCode != 0 (ausente)', () => {
  assert.equal(hasTool('uv', () => ({ exitCode: 1 })), false);
});

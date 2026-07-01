import { test, expect } from "vitest";
import { hasTool } from '../src/commands/setup.js';

test('hasTool true quando runSync retorna exitCode 0', () => {
  expect(hasTool('uv', () => ({ exitCode: 0 }))).toBe(true);
});

test('hasTool false quando runSync retorna exitCode != 0 (ausente)', () => {
  expect(hasTool('uv', () => ({ exitCode: 1 }))).toBe(false);
});

import { test, expect } from "vitest";
import assert from "node:assert/strict";
import { vscode, detectVSCode } from '../src/commands/vscode.js';

function mockLauncher(found, opened = []) {
  return {
    detectVSCode: () => found,
    openVSCode: async () => { opened.push(true); },
  };
}

test('detectVSCode usa runProcessHandoffSync injetável e lê exitCode', () => {
  expect(detectVSCode(() => ({ exitCode: 0 }))).toBe(true);
  expect(detectVSCode(() => ({ exitCode: 1 }))).toBe(false);
});

test('vscode abre quando code CLI está disponível', async () => {
  const opened = [];
  await vscode([], undefined, mockLauncher(true, opened));
  expect(opened.length).toBe(1);
});

test('vscode falha quando code CLI não está instalado', async () => {
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await (async () => { let __refarmDidThrow = false; let __refarmThrown; try { await (() => vscode([], undefined, mockLauncher(false)))(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => { assert.ok(err.message.startsWith('exit:')); return true; })(__refarmThrown)).toBeTruthy(); })();
    expect(exitCode).toBe(1);
  } finally {
    process.exit = origExit;
  }
});

test('vscode com --help imprime ajuda sem tentar abrir', async () => {
  const opened = [];
  let output = '';
  const origLog = console.log;
  console.log = (s) => { output += s; };
  try {
    await vscode(['--help'], undefined, mockLauncher(true, opened));
  } finally {
    console.log = origLog;
  }
  expect(opened.length).toBe(0);
  expect(output.includes('dgk vscode')).toBeTruthy();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vscode } from '../src/commands/vscode.js';

function mockLauncher(found, opened = []) {
  return {
    detectVSCode: () => found,
    openVSCode: async () => { opened.push(true); },
  };
}

test('vscode abre quando code CLI está disponível', async () => {
  const opened = [];
  await vscode([], undefined, mockLauncher(true, opened));
  assert.equal(opened.length, 1);
});

test('vscode falha quando code CLI não está instalado', async () => {
  const origExit = process.exit;
  let exitCode;
  process.exit = (code) => { exitCode = code; throw new Error(`exit:${code}`); };
  try {
    await assert.rejects(
      () => vscode([], undefined, mockLauncher(false)),
      (err) => { assert.ok(err.message.startsWith('exit:')); return true; },
    );
    assert.equal(exitCode, 1);
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
  assert.equal(opened.length, 0);
  assert.ok(output.includes('dgk vscode'));
});

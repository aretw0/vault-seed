import { test, expect } from "vitest";
import assert from "node:assert/strict";
import { run } from '../src/index.js';

test('run resolve quando processo sai com código 0', async () => {
  await expect((() => run('node', ['--version']))()).resolves.not.toThrow();
});

test('run rejeita quando processo sai com código não-zero', async () => {
  await (async () => { let __refarmDidThrow = false; let __refarmThrown; try { await (() => run('node', ['-e', 'process.exit(2)']))(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.includes('exited with code 2'), `mensagem inesperada: ${err.message}`);
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

test('run rejeita com mensagem contendo cmd e args', async () => {
  await (async () => { let __refarmDidThrow = false; let __refarmThrown; try { await (() => run('node', ['-e', 'process.exit(1)']))(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.includes('node'), 'deve incluir o comando');
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

test('run rejeita quando o comando não existe', async () => {
  await expect(() => run('comando-que-nao-existe-dgk', [])).rejects.toThrow();
});

test('run rejeita quando o processo sai com código diferente de 0', async () => {
  await expect(() => run('node', ['-e', 'process.exit(3)'])).rejects.toThrow();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// dgk shells out to scripts/ living in the vault repo (not vendored in the
// npm package). If a user deletes scripts/ thinking it's template cruft,
// these commands break. This contract scans every command file for
// scripts/<file> string literals and asserts the file actually exists —
// self-maintaining: a new reference added to a command is checked
// automatically, no list to keep in sync by hand.

const COMMANDS_DIR = fileURLToPath(new URL('../src/commands', import.meta.url));
const VAULT_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SCRIPT_REF_RE = /scripts\/[\w.-]+\.(?:mjs|js|py)/g;

function findScriptReferences() {
  const refs = new Set();
  for (const file of readdirSync(COMMANDS_DIR)) {
    if (!file.endsWith('.js')) continue;
    const content = readFileSync(join(COMMANDS_DIR, file), 'utf8');
    for (const match of content.matchAll(SCRIPT_REF_RE)) {
      refs.add(match[0]);
    }
  }
  return [...refs].sort();
}

test('todo script/* referenciado por um comando dgk existe na raiz do vault', () => {
  const refs = findScriptReferences();
  assert.ok(refs.length > 0, 'deve encontrar ao menos uma referência scripts/* nos comandos dgk');

  const missing = refs.filter((ref) => !existsSync(join(VAULT_ROOT, ref)));
  assert.deepEqual(
    missing,
    [],
    `scripts ausentes referenciados por comandos dgk: ${missing.join(', ')}. ` +
      'Se um desses arquivos foi removido do vault, os comandos dgk correspondentes ' +
      'vão falhar para o usuário. Restaure o arquivo ou vendorize-o em packages/cli/vendor/.',
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

test('package manifest vendors quality scripts without Python cache artifacts', () => {
  assert.ok(pkg.files.includes('vendor'), 'dgk-cli deve publicar scripts vendorizados');
  assert.ok(pkg.files.includes('!vendor/**/__pycache__'), 'dgk-cli não deve publicar __pycache__');
  assert.ok(pkg.files.includes('!vendor/**/*.pyc'), 'dgk-cli não deve publicar bytecode Python');
});

import { test, expect } from "vitest";
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

test('package manifest vendors quality scripts without Python cache artifacts', () => {
  expect(pkg.files.includes('vendor'), 'dgk-cli deve publicar scripts vendorizados').toBeTruthy();
  expect(pkg.files.includes('!vendor/**/__pycache__'), 'dgk-cli não deve publicar __pycache__').toBeTruthy();
  expect(pkg.files.includes('!vendor/**/*.pyc'), 'dgk-cli não deve publicar bytecode Python').toBeTruthy();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldSkill, scaffoldExtension } from '../src/commands/publish.js';

let tmpDir;

test.before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'publish-test-'));
});

test.after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// --- scaffoldSkill ---

test('scaffoldSkill cria package.json com pi.skills', () => {
  scaffoldSkill('minha-skill', tmpDir);
  const pkg = JSON.parse(
    readFileSync(join(tmpDir, 'packages', 'minha-skill', 'package.json'), 'utf8'),
  );
  assert.deepEqual(pkg.pi.skills, ['skills/minha-skill']);
  assert.ok(pkg.keywords.includes('pi-package'), 'keywords deve incluir pi-package');
  assert.equal(pkg.name, '@YOUR_NPM_USERNAME/minha-skill');
  assert.equal(pkg.version, '0.1.0');
});

test('scaffoldSkill cria SKILL.md no diretório correto', () => {
  const skillPath = join(tmpDir, 'packages', 'minha-skill', 'skills', 'minha-skill', 'SKILL.md');
  assert.ok(existsSync(skillPath), 'SKILL.md deve existir');
  const content = readFileSync(skillPath, 'utf8');
  assert.ok(content.includes('name: minha-skill'), 'SKILL.md deve ter o nome correto');
});

test('scaffoldSkill cria workflow de publicação em .github/workflows/', () => {
  const workflowPath = join(tmpDir, '.github', 'workflows', 'publish-minha-skill.yml');
  assert.ok(existsSync(workflowPath), 'workflow de publicação deve existir');
  const content = readFileSync(workflowPath, 'utf8');
  assert.ok(content.includes('@YOUR_NPM_USERNAME/minha-skill@*'), 'workflow deve usar o padrão de tag correto');
  assert.ok(content.includes('NPM_TOKEN'), 'workflow deve referenciar NPM_TOKEN');
  assert.ok(content.includes('--provenance'), 'workflow deve publicar com provenance');
});

test('scaffoldSkill falha quando pacote já existe', () => {
  assert.throws(
    () => scaffoldSkill('minha-skill', tmpDir),
    (err) => {
      assert.ok(err.message.includes('já existe'), `mensagem de erro inesperada: ${err.message}`);
      return true;
    },
  );
});

// --- scaffoldExtension ---

test('scaffoldExtension cria package.json com pi.extensions', () => {
  scaffoldExtension('minha-extensao', tmpDir);
  const pkg = JSON.parse(
    readFileSync(join(tmpDir, 'packages', 'minha-extensao', 'package.json'), 'utf8'),
  );
  assert.deepEqual(pkg.pi.extensions, ['src/index.ts']);
  assert.ok(pkg.keywords.includes('pi-package'), 'keywords deve incluir pi-package');
  assert.equal(pkg.type, 'module');
  assert.ok(
    '@earendil-works/pi-coding-agent' in pkg.dependencies,
    'deve declarar dependência do Pi runtime',
  );
});

test('scaffoldExtension cria src/index.ts', () => {
  const tsPath = join(tmpDir, 'packages', 'minha-extensao', 'src', 'index.ts');
  assert.ok(existsSync(tsPath), 'src/index.ts deve existir');
  const content = readFileSync(tsPath, 'utf8');
  assert.ok(content.includes('ExtensionAPI'), 'deve importar ExtensionAPI');
  assert.ok(content.includes('registerTool'), 'deve chamar registerTool');
});

test('scaffoldExtension cria workflow de publicação em .github/workflows/', () => {
  const workflowPath = join(tmpDir, '.github', 'workflows', 'publish-minha-extensao.yml');
  assert.ok(existsSync(workflowPath), 'workflow de publicação deve existir');
  const content = readFileSync(workflowPath, 'utf8');
  assert.ok(content.includes('@YOUR_NPM_USERNAME/minha-extensao@*'), 'workflow deve usar o padrão de tag correto');
  assert.ok(content.includes('--provenance'), 'workflow deve publicar com provenance');
});

test('scaffoldExtension falha quando pacote já existe', () => {
  assert.throws(
    () => scaffoldExtension('minha-extensao', tmpDir),
    (err) => {
      assert.ok(err.message.includes('já existe'), `mensagem de erro inesperada: ${err.message}`);
      return true;
    },
  );
});

test('scaffoldSkill e scaffoldExtension criam pacotes com nomes diferentes', () => {
  scaffoldSkill('skill-unica', tmpDir);
  scaffoldExtension('extensao-unica', tmpDir);
  assert.ok(existsSync(join(tmpDir, 'packages', 'skill-unica')));
  assert.ok(existsSync(join(tmpDir, 'packages', 'extensao-unica')));
});

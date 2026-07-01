import { test, expect } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffoldSkill, scaffoldExtension } from '../src/commands/publish.js';

let tmpDir;

test.beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'publish-test-'));
});

test.afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// --- scaffoldSkill ---

test('scaffoldSkill cria package.json com pi.skills', () => {
  scaffoldSkill('minha-skill', tmpDir);
  const pkg = JSON.parse(
    readFileSync(join(tmpDir, 'packages', 'minha-skill', 'package.json'), 'utf8'),
  );
  expect(pkg.pi.skills).toEqual(['skills/minha-skill']);
  expect(pkg.keywords.includes('pi-package'), 'keywords deve incluir pi-package').toBeTruthy();
  expect(pkg.name).toBe('@YOUR_NPM_USERNAME/minha-skill');
  expect(pkg.version).toBe('0.1.0');
});

test('scaffoldSkill cria SKILL.md no diretório correto', () => {
  const skillPath = join(tmpDir, 'packages', 'minha-skill', 'skills', 'minha-skill', 'SKILL.md');
  expect(existsSync(skillPath), 'SKILL.md deve existir').toBeTruthy();
  const content = readFileSync(skillPath, 'utf8');
  expect(content.includes('name: minha-skill'), 'SKILL.md deve ter o nome correto').toBeTruthy();
});

test('scaffoldSkill cria workflow de publicação em .github/workflows/', () => {
  const workflowPath = join(tmpDir, '.github', 'workflows', 'publish-minha-skill.yml');
  expect(existsSync(workflowPath), 'workflow de publicação deve existir').toBeTruthy();
  const content = readFileSync(workflowPath, 'utf8');
  expect(content.includes('@YOUR_NPM_USERNAME/minha-skill@*'), 'workflow deve usar o padrão de tag correto').toBeTruthy();
  expect(content.includes('NPM_TOKEN'), 'workflow deve referenciar NPM_TOKEN').toBeTruthy();
  expect(content.includes('--provenance'), 'workflow deve publicar com provenance').toBeTruthy();
});

test('scaffoldSkill falha quando pacote já existe', () => {
  (() => { let __refarmDidThrow = false; let __refarmThrown; try { (() => scaffoldSkill('minha-skill', tmpDir))(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.includes('já existe'), `mensagem de erro inesperada: ${err.message}`);
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

// --- scaffoldExtension ---

test('scaffoldExtension cria package.json com pi.extensions', () => {
  scaffoldExtension('minha-extensao', tmpDir);
  const pkg = JSON.parse(
    readFileSync(join(tmpDir, 'packages', 'minha-extensao', 'package.json'), 'utf8'),
  );
  expect(pkg.pi.extensions).toEqual(['src/index.ts']);
  expect(pkg.keywords.includes('pi-package'), 'keywords deve incluir pi-package').toBeTruthy();
  expect(pkg.type).toBe('module');
  expect('@earendil-works/pi-coding-agent' in pkg.dependencies, 'deve declarar dependência do Pi runtime').toBeTruthy();
});

test('scaffoldExtension cria src/index.ts', () => {
  const tsPath = join(tmpDir, 'packages', 'minha-extensao', 'src', 'index.ts');
  expect(existsSync(tsPath), 'src/index.ts deve existir').toBeTruthy();
  const content = readFileSync(tsPath, 'utf8');
  expect(content.includes('ExtensionAPI'), 'deve importar ExtensionAPI').toBeTruthy();
  expect(content.includes('registerTool'), 'deve chamar registerTool').toBeTruthy();
});

test('scaffoldExtension cria workflow de publicação em .github/workflows/', () => {
  const workflowPath = join(tmpDir, '.github', 'workflows', 'publish-minha-extensao.yml');
  expect(existsSync(workflowPath), 'workflow de publicação deve existir').toBeTruthy();
  const content = readFileSync(workflowPath, 'utf8');
  expect(content.includes('@YOUR_NPM_USERNAME/minha-extensao@*'), 'workflow deve usar o padrão de tag correto').toBeTruthy();
  expect(content.includes('--provenance'), 'workflow deve publicar com provenance').toBeTruthy();
});

test('scaffoldExtension falha quando pacote já existe', () => {
  (() => { let __refarmDidThrow = false; let __refarmThrown; try { (() => scaffoldExtension('minha-extensao', tmpDir))(); } catch (error) { __refarmDidThrow = true; __refarmThrown = error; } expect(__refarmDidThrow).toBe(true); expect(((err) => {
      assert.ok(err.message.includes('já existe'), `mensagem de erro inesperada: ${err.message}`);
      return true;
    })(__refarmThrown)).toBeTruthy(); })();
});

test('scaffoldSkill e scaffoldExtension criam pacotes com nomes diferentes', () => {
  scaffoldSkill('skill-unica', tmpDir);
  scaffoldExtension('extensao-unica', tmpDir);
  expect(existsSync(join(tmpDir, 'packages', 'skill-unica'))).toBeTruthy();
  expect(existsSync(join(tmpDir, 'packages', 'extensao-unica'))).toBeTruthy();
});

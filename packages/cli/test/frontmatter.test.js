import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yamlScalar, toYaml, renderFrontmatter } from '../src/frontmatter.js';

// --- yamlScalar ---

test('yamlScalar: string simples sem aspas', () => {
  assert.equal(yamlScalar('pkm'), 'pkm');
  assert.equal(yamlScalar('jardim-digital'), 'jardim-digital');
});

test('yamlScalar: string com : recebe aspas', () => {
  assert.equal(yamlScalar('foo: bar'), '"foo: bar"');
});

test('yamlScalar: string que é palavra reservada YAML recebe aspas', () => {
  assert.equal(yamlScalar('null'), '"null"');
  assert.equal(yamlScalar('true'), '"true"');
  assert.equal(yamlScalar('false'), '"false"');
});

test('yamlScalar: número como string recebe aspas', () => {
  assert.equal(yamlScalar('42'), '"42"');
  assert.equal(yamlScalar('3.14'), '"3.14"');
});

test('yamlScalar: boolean nativo sem aspas', () => {
  assert.equal(yamlScalar(true), 'true');
  assert.equal(yamlScalar(false), 'false');
});

test('yamlScalar: número nativo sem aspas', () => {
  assert.equal(yamlScalar(0), '0');
  assert.equal(yamlScalar(42), '42');
});

test('yamlScalar: null/undefined retorna null', () => {
  assert.equal(yamlScalar(null), 'null');
  assert.equal(yamlScalar(undefined), 'null');
  assert.equal(yamlScalar(''), 'null');
});

// --- toYaml ---

test('toYaml: array vazio como inline []', () => {
  assert.equal(toYaml([]), '[]');
});

test('toYaml: array de strings com -', () => {
  assert.equal(toYaml(['pkm', 'jardim-digital']), '- pkm\n- jardim-digital');
});

test('toYaml: objeto simples', () => {
  assert.equal(toYaml({ title: 'Minha nota', status: 'draft' }), 'title: Minha nota\nstatus: draft');
});

test('toYaml: objeto com array aninhado', () => {
  const result = toYaml({ tags: ['pkm', 'vault'] });
  assert.ok(result.includes('tags:'), 'deve ter chave tags');
  assert.ok(result.includes('- pkm'), 'deve listar pkm');
  assert.ok(result.includes('- vault'), 'deve listar vault');
});

test('toYaml: objeto com array vazio inline', () => {
  assert.equal(toYaml({ channels: [] }), 'channels: []');
});

// --- renderFrontmatter ---

test('renderFrontmatter: envolve em --- delimitadores', () => {
  const result = renderFrontmatter({ title: 'Teste', status: 'draft' });
  assert.ok(result.startsWith('---\n'), 'deve começar com ---');
  assert.ok(result.endsWith('\n---'), 'deve terminar com ---');
});

test('renderFrontmatter: produz YAML válido para nota típica', () => {
  const fm = {
    title: 'Jardim digital',
    tags: ['pkm', 'jardim-digital'],
    status: 'draft',
    channels: [],
  };
  const result = renderFrontmatter(fm);
  assert.ok(result.includes('title: Jardim digital'));
  assert.ok(result.includes('- pkm'));
  assert.ok(result.includes('channels: []'));
});

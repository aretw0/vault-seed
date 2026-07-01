import { test, expect } from "vitest";
import { yamlScalar, toYaml, renderFrontmatter } from '../src/frontmatter.js';

// --- yamlScalar ---

test('yamlScalar: string simples sem aspas', () => {
  expect(yamlScalar('pkm')).toBe('pkm');
  expect(yamlScalar('jardim-digital')).toBe('jardim-digital');
});

test('yamlScalar: string com : recebe aspas', () => {
  expect(yamlScalar('foo: bar')).toBe('"foo: bar"');
});

test('yamlScalar: string que é palavra reservada YAML recebe aspas', () => {
  expect(yamlScalar('null')).toBe('"null"');
  expect(yamlScalar('true')).toBe('"true"');
  expect(yamlScalar('false')).toBe('"false"');
});

test('yamlScalar: número como string recebe aspas', () => {
  expect(yamlScalar('42')).toBe('"42"');
  expect(yamlScalar('3.14')).toBe('"3.14"');
});

test('yamlScalar: boolean nativo sem aspas', () => {
  expect(yamlScalar(true)).toBe('true');
  expect(yamlScalar(false)).toBe('false');
});

test('yamlScalar: número nativo sem aspas', () => {
  expect(yamlScalar(0)).toBe('0');
  expect(yamlScalar(42)).toBe('42');
});

test('yamlScalar: null/undefined retorna null', () => {
  expect(yamlScalar(null)).toBe('null');
  expect(yamlScalar(undefined)).toBe('null');
  expect(yamlScalar('')).toBe('null');
});

// --- toYaml ---

test('toYaml: array vazio como inline []', () => {
  expect(toYaml([])).toBe('[]');
});

test('toYaml: array de strings com -', () => {
  expect(toYaml(['pkm', 'jardim-digital'])).toBe('- pkm\n- jardim-digital');
});

test('toYaml: objeto simples', () => {
  expect(toYaml({ title: 'Minha nota', status: 'draft' })).toBe('title: Minha nota\nstatus: draft');
});

test('toYaml: objeto com array aninhado', () => {
  const result = toYaml({ tags: ['pkm', 'vault'] });
  expect(result.includes('tags:'), 'deve ter chave tags').toBeTruthy();
  expect(result.includes('- pkm'), 'deve listar pkm').toBeTruthy();
  expect(result.includes('- vault'), 'deve listar vault').toBeTruthy();
});

test('toYaml: objeto com array vazio inline', () => {
  expect(toYaml({ channels: [] })).toBe('channels: []');
});

// --- renderFrontmatter ---

test('renderFrontmatter: envolve em --- delimitadores', () => {
  const result = renderFrontmatter({ title: 'Teste', status: 'draft' });
  expect(result.startsWith('---\n'), 'deve começar com ---').toBeTruthy();
  expect(result.endsWith('\n---'), 'deve terminar com ---').toBeTruthy();
});

test('renderFrontmatter: produz YAML válido para nota típica', () => {
  const fm = {
    title: 'Jardim digital',
    tags: ['pkm', 'jardim-digital'],
    status: 'draft',
    channels: [],
  };
  const result = renderFrontmatter(fm);
  expect(result.includes('title: Jardim digital')).toBeTruthy();
  expect(result.includes('- pkm')).toBeTruthy();
  expect(result.includes('channels: []')).toBeTruthy();
});

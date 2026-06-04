#!/usr/bin/env node
// scripts/check_theme.js
// Verifica os pares de contraste WCAG AA das paletas de tema.
//
// Para cada arquivo em .site/styles/themes/:
//   - Extrai variáveis CSS do bloco :root (dark mode)
//   - Extrai variáveis CSS do bloco [data-theme='light'] (light mode)
//   - Calcula contraste dos pares críticos: texto/fundo, accent/fundo
//   - Falha se algum par ficar abaixo de 4.5:1 (WCAG AA texto normal)
//
// Uso: node scripts/check_theme.js
//       pnpm run validate:theme

'use strict';

const fs   = require('fs');
const path = require('path');

// ── WCAG contrast utilities ──────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }) {
  const chan = v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// ── CSS variable extraction ──────────────────────────────────────────────────

function extractBlock(css, blockPattern) {
  const m = css.match(blockPattern);
  if (!m) return {};
  const block = m[1];
  const vars = {};
  for (const [, name, value] of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

function parseTheme(filePath) {
  const css = fs.readFileSync(filePath, 'utf-8');

  // :root block (dark mode) — matches first top-level :root { ... }
  const darkVars = extractBlock(css,
    /:root\s*\{([^}]+)\}/);

  // [data-theme='light'] block (light mode)
  const lightVars = extractBlock(css,
    /\[data-theme=['"]light['"]\][^{]*\{([^}]+)\}/);

  return { dark: darkVars, light: lightVars };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseMarimoVariant(css, selector) {
  return extractBlock(css, new RegExp(`${escapeRegExp(selector)}[^{}]*\\{([^}]+)\\}`));
}

// ── Check pairs ───────────────────────────────────────────────────────────────

const THEME_DIR = path.join(__dirname, '..', '.site', 'styles', 'themes');

// Pairs to check per mode: [varFg, varBg, label, minRatio]
const PAIRS = [
  ['sl-color-white',       'sl-color-black', 'texto/fundo',      4.5],
  ['sl-color-gray-1',      'sl-color-black', 'gray-1/fundo',     3.0],
  ['sl-color-accent',      'sl-color-black', 'accent/fundo',     4.5],
  ['sl-color-accent-high', 'sl-color-black', 'accent-high/fundo', 3.0],
];

const MARIMO_PAIRS = [
  ['foreground',         'background', 'texto/fundo',       4.5],
  ['popover-foreground', 'popover',    'select/popover',    4.5],
  ['popover-foreground', 'popover',    'tooltip/hover',     4.5],
  ['muted-foreground',   'background', 'cabecalho/tabela',  4.5],
  ['accent-foreground',  'accent',     'item selecionado',  4.5],
];

let failures = 0;

const files = fs.readdirSync(THEME_DIR).filter(f => f.endsWith('.css'));
if (files.length === 0) {
  console.error('check_theme: nenhum arquivo de tema encontrado em', THEME_DIR);
  process.exit(1);
}

for (const file of files.sort()) {
  const filePath = path.join(THEME_DIR, file);
  const theme = parseTheme(filePath);
  const name = file.replace('.css', '');

  for (const [modeName, vars] of [['escuro', theme.dark], ['claro', theme.light]]) {
    const missingMode = !Object.keys(vars).length;
    if (missingMode) {
      console.error(`  ✗ ${name} [${modeName}]: bloco não encontrado`);
      failures++;
      continue;
    }

    for (const [fgVar, bgVar, label, minRatio] of PAIRS) {
      const fg = vars[fgVar];
      const bg = vars[bgVar];

      if (!fg || !bg) continue; // variável não definida neste bloco — ok (herda)

      if (!fg.startsWith('#') || !bg.startsWith('#')) continue; // skip não-hex (hsl etc.)

      const ratio = contrastRatio(fg, bg);
      const pass  = ratio >= minRatio;
      const icon  = pass ? '✓' : '✗';
      const line  = `  ${icon} ${name} [${modeName}] ${label}: ${ratio.toFixed(1)}:1` +
                    (pass ? '' : `  ← FALHA (mínimo ${minRatio}:1)`);

      if (pass) {
        console.log(line);
      } else {
        console.error(line);
        failures++;
      }
    }
  }
}

const marimoCssPath = path.join(__dirname, '..', '.site', 'styles', 'marimo-vault.css');
const marimoCss = fs.readFileSync(marimoCssPath, 'utf-8');
const marimoVariants = [
  ['verde-jardim', 'claro', ':root[data-vault-marimo-theme="light"]'],
  ['verde-jardim', 'escuro', ':root[data-vault-marimo-theme="dark"]'],
  ['oceano', 'claro', ':root[data-vault-marimo-theme="light"][data-vault-marimo-palette="oceano"]'],
  ['oceano', 'escuro', ':root[data-vault-marimo-theme="dark"][data-vault-marimo-palette="oceano"]'],
  ['terracota', 'claro', ':root[data-vault-marimo-theme="light"][data-vault-marimo-palette="terracota"]'],
  ['terracota', 'escuro', ':root[data-vault-marimo-theme="dark"][data-vault-marimo-palette="terracota"]'],
];

for (const [name, modeName, selector] of marimoVariants) {
  const vars = parseMarimoVariant(marimoCss, selector);
  if (!Object.keys(vars).length) {
    console.error(`  ✗ marimo ${name} [${modeName}]: bloco não encontrado`);
    failures++;
    continue;
  }

  for (const [fgVar, bgVar, label, minRatio] of MARIMO_PAIRS) {
    const fg = vars[fgVar];
    const bg = vars[bgVar];

    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) continue;

    const ratio = contrastRatio(fg, bg);
    const pass  = ratio >= minRatio;
    const icon  = pass ? '✓' : '✗';
    const line  = `  ${icon} marimo ${name} [${modeName}] ${label}: ${ratio.toFixed(1)}:1` +
                  (pass ? '' : `  ← FALHA (mínimo ${minRatio}:1)`);

    if (pass) {
      console.log(line);
    } else {
      console.error(line);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\ncheck_theme: ${failures} falha(s) de contraste encontrada(s).`);
  process.exit(1);
} else {
  console.log('\ncheck_theme: todos os contrastes passaram. ✓');
}

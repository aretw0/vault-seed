#!/usr/bin/env node
// scripts/check_mermaid.js
// Valida sintaxe dos blocos Mermaid nas notas do vault.
//
// Detecta os padrões que causam falha de renderização no browser:
//   1. stateDiagram-v2 — IDs de estado com caracteres não-ASCII
//      (precisam ser `state "Label" as asciiId`)
//   2. flowchart/graph — IDs de nó não-ASCII sem label explícito
//      (ex: `A --> Organização` onde Organização é usado como ID)
//   3. Labels de aresta com [[wikilinks]] (confunde o lexer do Mermaid)
//   4. Labels não-quotados em nós `id(text)` contendo `/`
//      (/ pode ser interpretado como delimitador de shape)
//
// Uso: node scripts/check_mermaid.js
//      pnpm run validate:mermaid

'use strict';

const fs   = require('fs');
const path = require('path');
const { globSync } = require('glob');

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

// All compared lowercase against the first token of the diagram declaration
const VALID_DIAGRAM_TYPES = new Set([
  'flowchart', 'graph', 'sequencediagram', 'classdiagram',
  'statediagram', 'statediagram-v2', 'erdiagram', 'gantt',
  'pie', 'gitgraph', 'mindmap', 'timeline', 'xychart-beta',
  'quadrantchart', 'requirementdiagram', 'c4context',
  'block-beta', 'packet-beta',
]);

// ── helpers ──────────────────────────────────────────────────────────────────

const ASCII_ID = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

function hasNonAsciiId(token) {
  // Returns true if the token looks like a non-ASCII identifier
  // (contains accented/unicode chars that break Mermaid's lexer)
  return /[^\x00-\x7F]/.test(token) && !ASCII_ID.test(token);
}

function extractMermaidBlocks(text) {
  const blocks = [];
  const re = /^```mermaid\s*\n([\s\S]*?)\n```/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ body: m[1], offset: m.index });
  }
  return blocks;
}

// ── per-block checks ──────────────────────────────────────────────────────────

function checkBlock(body, sourceFile, blockIndex) {
  const issues = [];
  const lines = body.split('\n');
  const firstLine = lines[0].trim();
  const diagramType = firstLine.split(/\s/)[0].toLowerCase();

  // Check 1 — valid diagram type on first line
  if (!VALID_DIAGRAM_TYPES.has(diagramType)) {
    issues.push(`linha 1: tipo de diagrama desconhecido "${firstLine.split(/\s/)[0]}"`);
  }

  // Check 2 — [[...]] in edge labels (all diagram types)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/--\s*"[^"]*\[\[[^\]]*\]\][^"]*"\s*-->/.test(line) ||
        /\|\s*\[\[[^\]]*\]\]\s*\|/.test(line)) {
      issues.push(`linha ${i + 1}: label de aresta com [[wikilink]] — quebra o lexer: ${line.trim()}`);
    }
  }

  const isStateV2 = diagramType === 'statediagram-v2' || diagramType === 'statediagram';
  const isFlow    = diagramType === 'flowchart' || diagramType === 'graph';

  // Check 3 — stateDiagram-v2: non-ASCII state IDs
  if (isStateV2) {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%') || line.startsWith('note') ||
          line.startsWith('state "') || line.startsWith('[*]')) continue;

      // Transition: StateId --> OtherId : label
      const transMatch = line.match(/^([^\s\-\[{%:]+)\s*-->/);
      if (transMatch) {
        const id = transMatch[1].trim();
        if (hasNonAsciiId(id)) {
          issues.push(`linha ${i + 1}: ID de estado não-ASCII "${id}" — use \`state "Label" as asciiId\``);
        }
      }
      // Right side of transition
      const afterArrow = line.match(/-->\s*([^\s:{[]+)/);
      if (afterArrow) {
        const id = afterArrow[1].trim();
        if (id !== '[*]' && hasNonAsciiId(id)) {
          issues.push(`linha ${i + 1}: ID de estado não-ASCII "${id}" — use \`state "Label" as asciiId\``);
        }
      }
    }
  }

  // Check 4 — flowchart: non-ASCII node IDs and unquoted ( ) labels with /
  if (isFlow) {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('%%') || line.startsWith('classDef') ||
          line.startsWith('subgraph') || line.startsWith('end') ||
          line.startsWith('direction') || line.startsWith('linkStyle') ||
          line.startsWith('style ')) continue;

      // Capture node IDs: things that look like `id[`, `id(`, `id{`, `id --`, `id -->`
      const nodeRe = /\b([a-zA-Z_À-ɏ][a-zA-Z0-9_\-À-ɏ]*)(?=\s*[\[({]|\s*-->|\s*---|\s*--\s)/g;
      let nm;
      while ((nm = nodeRe.exec(line)) !== null) {
        const candidate = nm[1];
        if (hasNonAsciiId(candidate)) {
          issues.push(`linha ${i + 1}: ID de nó não-ASCII "${candidate}" — use id["Label"] com ID ASCII separado`);
        }
      }

      // Unquoted ( ) label containing / : id(text/more) without quotes around text
      // Pattern: word followed by ( then text without " that contains /
      const unquotedSlash = /\w+\((?!")([^)]*\/[^)]*)\)/;
      if (unquotedSlash.test(line)) {
        const m2 = line.match(unquotedSlash);
        issues.push(`linha ${i + 1}: label não-quotado com "/" dentro de () — use id("texto / com barra"): ${line.trim()}`);
      }
    }
  }

  return issues;
}

// ── main ──────────────────────────────────────────────────────────────────────

const root    = path.join(__dirname, '..');
const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
const files    = globSync(patterns, { cwd: root });

let totalBlocks  = 0;
let totalIssues  = 0;
const byType     = {};

for (const file of files.sort()) {
  const content  = fs.readFileSync(path.join(root, file), 'utf-8');
  const blocks   = extractMermaidBlocks(content);
  if (blocks.length === 0) continue;

  const fileIssues = [];

  for (let b = 0; b < blocks.length; b++) {
    const { body } = blocks[b];
    totalBlocks++;

    const firstToken = body.trim().split(/\s/)[0].toLowerCase();
    byType[firstToken] = (byType[firstToken] || 0) + 1;

    const issues = checkBlock(body, file, b + 1);
    if (issues.length > 0) {
      totalIssues += issues.length;
      fileIssues.push({ index: b + 1, issues });
    }
  }

  if (fileIssues.length > 0) {
    console.error(`\n  ${file}`);
    for (const { index, issues } of fileIssues) {
      console.error(`  bloco #${index}:`);
      for (const issue of issues) {
        console.error(`    ✗ ${issue}`);
      }
    }
  }
}

console.log(`\ncheck_mermaid: ${totalBlocks} diagrama(s) — tipos: ${
  Object.entries(byType).map(([k, v]) => `${k}(${v})`).join(', ')
}`);

if (totalIssues > 0) {
  console.error(`check_mermaid: ${totalIssues} problema(s) encontrado(s). Diagrama(s) podem não renderizar corretamente.\n`);
  process.exit(1);
} else {
  console.log('check_mermaid: nenhum problema encontrado. ✓\n');
}

/**
 * End-to-end simulation of initialize.yml — validates the user vault contract.
 *
 * Models all three steps of initialize-and-self-destruct:
 *   Step 1 — template-initializer action:
 *     a. Rename template files (README.template.md → README.md, etc.)
 *     b. Remove template-only files and directories
 *     c. Self-destruct: remove initialize.yml
 *   Step 2 — Note reset: status: published → status: draft for 38 reference notes
 *   Step 3 — GitHub Pages enable (not testable in Node.js — skipped)
 *
 * Uses `git ls-files` as the source of truth for what ships to users.
 * All operations run in a temp directory — no source files are modified.
 *
 * Contract validated on the resulting user vault:
 *   A. Every entry in files_to_remove is absent
 *   B. Every renamed file exists at its destination; source is gone
 *   C. initialize.yml is absent (self-destruct)
 *   D. package.json exists and comes from package.template.json
 *   E. PUBLISHED notes (Bem-vindo) have status: published
 *   F. publishedResetOnInit notes have status: draft
 *   G. No other .md files have status: published (global scan)
 *
 * Run: node scripts/smoke_user_vault.mjs
 */
import {
  mkdtempSync, mkdirSync, copyFileSync, rmSync,
  existsSync, readFileSync, writeFileSync, readdirSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// ---------------------------------------------------------------------------
// Parse initialize.yml — single source of truth for what ships to users.
// Handles bash-escaped spaces in paths: 99\ -\ Meta\ e\ Anexos/...
// ---------------------------------------------------------------------------
function parseInitializeYml() {
  const content = readFileSync(join(ROOT, '.github/workflows/initialize.yml'), 'utf8');

  const parseTokens = (str) =>
    str
      .replace(/\\ /g, '\x00')   // backslash-space → placeholder
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s.replace(/\x00/g, ' '));

  const removeMatch = content.match(/files_to_remove:\s*"([^"]+)"/);
  const renameMatch = content.match(/files_to_rename:\s*"([^"]+)"/);

  const filesToRemove = removeMatch ? parseTokens(removeMatch[1]) : [];
  const filesToRename = renameMatch
    ? parseTokens(renameMatch[1]).map((pair) => {
        const colon = pair.indexOf(':');
        return { src: pair.slice(0, colon), dst: pair.slice(colon + 1) };
      })
    : [];

  // Derive the workflow filename from the action input (it self-destructs).
  const workflowMatch = content.match(/workflow_filename:\s*"([^"]+)"/);
  const workflowFilename = workflowMatch ? workflowMatch[1] : '.github/workflows/initialize.yml';

  return { filesToRemove, filesToRename, workflowFilename };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeCopy(src, dst) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}

function extractStatus(content) {
  const m = content.replace(/^﻿/, '').match(/^---[\s\S]*?^status:\s*(\S+)/m);
  return m ? m[1] : null;
}

function applyStatusReset(content) {
  return content
    .split(/\r?\n/)
    .map((line) => (line === 'status: published' ? 'status: draft' : line))
    .join('\n');
}

function findMd(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMd(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Contracts: must match smoke_template.js NOTE_STATUS_CONTRACT
// ---------------------------------------------------------------------------
const PUBLISHED_IN_USER_VAULT = [
  '00 - Entrada/Bem-vindo ao seu vault.md',
];

const RESET_ON_INIT = [
  '30 - Áreas/Blog/Jardim digital - por onde começar.md',
  '40 - Recursos/Mermaid.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando com Devcontainer.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Depois da Recepcao do Template.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Entendendo a Estrutura de Pastas.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Exploracao Guiada do Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md',
  '99 - Meta e Anexos/99.1 - Onboarding/MOC Vault Seed.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Seus Primeiros Passos.md',
  '99 - Meta e Anexos/99.2 - Workflows/Automacoes no Obsidian.md',
  '99 - Meta e Anexos/99.2 - Workflows/Coletando Dados Locais com Scraping e OCR.md',
  '99 - Meta e Anexos/99.2 - Workflows/Configurando o Obsidian Git.md',
  '99 - Meta e Anexos/99.2 - Workflows/Criando seu Painel de Controle (Dashboard).md',
  '99 - Meta e Anexos/99.2 - Workflows/Inbox Soberana de Fontes.md',
  '99 - Meta e Anexos/99.2 - Workflows/O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais).md',
  '99 - Meta e Anexos/99.2 - Workflows/Outbox Soberana de Publicação.md',
  '99 - Meta e Anexos/99.2 - Workflows/Preparando Dados para o Lab.md',
  '99 - Meta e Anexos/99.2 - Workflows/Publicando e Consumindo RSS no Vault.md',
  '99 - Meta e Anexos/99.2 - Workflows/Publicando seu Vault como Site.md',
  '99 - Meta e Anexos/99.2 - Workflows/Rotina de Curadoria Editorial.md',
  '99 - Meta e Anexos/99.2 - Workflows/Usando o Git e o GitHub para Sincronizar seu Vault.md',
  '99 - Meta e Anexos/99.2 - Workflows/Usando o Lab (Notebooks Marimo).md',
  '99 - Meta e Anexos/99.3 - Referência/Automatizando a Inicialização do Vault.md',
  '99 - Meta e Anexos/99.3 - Referência/Conhecendo o Agents Lab.md',
  '99 - Meta e Anexos/99.3 - Referência/Convenções e Boas Práticas.md',
  '99 - Meta e Anexos/99.3 - Referência/Ecossistema aretw0 Agents Lab e Refarm.md',
  '99 - Meta e Anexos/99.3 - Referência/Evoluindo seu Vault com Links, Tags e MOCs.md',
  '99 - Meta e Anexos/99.3 - Referência/Identidade Visual e Blocos de Interface.md',
  '99 - Meta e Anexos/99.3 - Referência/Integrando com VSCode (Foam).md',
  '99 - Meta e Anexos/99.3 - Referência/Plugins Essenciais e Recomendados.md',
  '99 - Meta e Anexos/99.3 - Referência/Qualidade e Lint de Notas.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando com Agentes de IA.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando o Plugin Templates.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando o Vault no Celular vs. Desktop.md',
  '99 - Meta e Anexos/99.3 - Referência/Visualização do Fluxo do Vault.md',
  '99 - Meta e Anexos/Diagramas/Exemplos.md',
];

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------
const errors = [];
let tmpDir = null;

try {
  const { filesToRemove, filesToRename, workflowFilename } = parseInitializeYml();

  // Step 0 — Copy all git-tracked files into a temp vault.
  const trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);

  tmpDir = mkdtempSync(join(tmpdir(), 'vault-seed-user-'));

  for (const file of trackedFiles) {
    safeCopy(join(ROOT, file), join(tmpDir, file));
  }

  // Step 1a — Rename (template-initializer renames before removing).
  for (const { src, dst } of filesToRename) {
    const srcPath = join(tmpDir, src);
    const dstPath = join(tmpDir, dst);
    if (existsSync(srcPath)) {
      safeCopy(srcPath, dstPath);
      rmSync(srcPath);
    }
  }

  // Step 1b — Remove template-only entries.
  for (const entry of filesToRemove) {
    const fullPath = join(tmpDir, entry);
    if (existsSync(fullPath)) rmSync(fullPath, { recursive: true, force: true });
  }

  // Step 1c — Self-destruct: the workflow removes itself.
  const selfPath = join(tmpDir, workflowFilename);
  if (existsSync(selfPath)) rmSync(selfPath);

  // Step 2 — Apply note reset (equivalent to the bash sed loop).
  for (const notePath of RESET_ON_INIT) {
    const fullPath = join(tmpDir, notePath);
    if (existsSync(fullPath)) {
      writeFileSync(fullPath, applyStatusReset(readFileSync(fullPath, 'utf8')));
    }
  }

  // -------------------------------------------------------------------------
  // Contract A — files_to_remove must be absent
  // -------------------------------------------------------------------------
  for (const entry of filesToRemove) {
    if (existsSync(join(tmpDir, entry))) {
      errors.push(`[A] SHOULD BE REMOVED but still exists: ${entry}`);
    }
  }

  // -------------------------------------------------------------------------
  // Contract B — renamed files: dst must exist, src must be gone
  // -------------------------------------------------------------------------
  for (const { src, dst } of filesToRename) {
    if (!existsSync(join(tmpDir, dst))) {
      errors.push(`[B] MISSING after rename: ${dst} (was ${src})`);
    }
    if (existsSync(join(tmpDir, src))) {
      errors.push(`[B] TEMPLATE SOURCE still present after rename: ${src}`);
    }
  }

  // -------------------------------------------------------------------------
  // Contract C — initialize.yml self-destructed
  // -------------------------------------------------------------------------
  if (existsSync(join(tmpDir, workflowFilename))) {
    errors.push(`[C] initialize.yml must be absent after init (self-destruct): ${workflowFilename}`);
  }

  // -------------------------------------------------------------------------
  // Contract D — package.json comes from package.template.json
  // -------------------------------------------------------------------------
  const userPkg = join(tmpDir, 'package.json');
  const templatePkg = join(tmpDir, 'package.template.json');
  if (!existsSync(userPkg)) {
    errors.push('[D] package.json missing from user vault');
  }
  if (existsSync(templatePkg)) {
    errors.push('[D] package.template.json still present — should have been renamed to package.json');
  }
  if (existsSync(userPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(userPkg, 'utf8'));
      // Verify the user received package.template.json, not the dev package.json.
      // The dev package has release-only and template-dev scripts that must not ship.
      // Scripts that live only in the dev package.json — must NOT reach users.
      const devOnlyScripts = [
        'release:package:smoke', 'changeset', 'changeset:version',
        'changeset:publish', 'release:verify',
        'smoke:template', 'smoke:user-vault', 'smoke:init:reset', 'smoke:e2e', 'smoke:e2e:full',
        'actions:pins', 'site:graph-smoke',
      ];
      for (const script of devOnlyScripts) {
        if (pkg.scripts?.[script]) {
          errors.push(`[D] package.json contains dev-only script '${script}' — user received the dev package, not the template`);
        }
      }
      if ('standard-version' in (pkg.devDependencies ?? {})) {
        errors.push('[D] package.json contains standard-version — release tooling leaked to user vault');
      }
    } catch {
      errors.push('[D] package.json is not valid JSON');
    }
  }

  // -------------------------------------------------------------------------
  // Contract E — permanently published notes retain status: published
  // -------------------------------------------------------------------------
  for (const notePath of PUBLISHED_IN_USER_VAULT) {
    const fullPath = join(tmpDir, notePath);
    if (!existsSync(fullPath)) {
      errors.push(`[E] MISSING: ${notePath} (must be published for users)`);
      continue;
    }
    const status = extractStatus(readFileSync(fullPath, 'utf8'));
    if (status !== 'published') {
      errors.push(`[E] ${notePath}: expected status: published, got: ${status ?? '(absent)'}`);
    }
  }

  // -------------------------------------------------------------------------
  // Contract F — publishedResetOnInit notes arrive as draft
  // -------------------------------------------------------------------------
  for (const notePath of RESET_ON_INIT) {
    const fullPath = join(tmpDir, notePath);
    if (!existsSync(fullPath)) {
      errors.push(`[F] MISSING reset note: ${notePath}`);
      continue;
    }
    const status = extractStatus(readFileSync(fullPath, 'utf8'));
    if (status !== 'draft') {
      errors.push(`[F] ${notePath}: expected status: draft after reset, got: ${status ?? '(absent)'}`);
    }
  }

  // -------------------------------------------------------------------------
  // Contract G — no other .md files have status: published (global scan)
  // -------------------------------------------------------------------------
  const allowedPublished = new Set(PUBLISHED_IN_USER_VAULT.map((p) => p.replace(/\\/g, '/')));
  for (const mdPath of findMd(tmpDir)) {
    const relPath = relative(tmpDir, mdPath).replace(/\\/g, '/');
    const status = extractStatus(readFileSync(mdPath, 'utf8'));
    if (status === 'published' && !allowedPublished.has(relPath)) {
      errors.push(`[G] UNEXPECTED PUBLISHED in user vault: ${relPath}`);
    }
  }

} finally {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error(`User vault smoke failed (${errors.length} violation${errors.length > 1 ? 's' : ''}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log('User vault smoke passed — simulated user vault matches contract.');

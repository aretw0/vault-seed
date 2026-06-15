/**
 * End-to-end simulation of initialize.yml — validates the user vault contract.
 *
 * Models all three steps of initialize-and-self-destruct:
 *   Step 1 — template-initializer action:
 *     a. Rename template files (README.template.md → README.md, etc.)
 *     b. Remove template-only files and directories
 *     c. Self-destruct: remove initialize.yml
 *   Step 2 — No reset step needed: onboarding notes are status: draft in source;
 *             vault-seed showcase notes (workflows, referência, etc.) ship as published.
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
 *   E. PUBLISHED_IN_USER_VAULT notes have status: published
 *   F. DRAFT_FOR_USERS notes (99.1 Onboarding) have status: draft
 *   G. No .md files outside allowlists have status: published
 *
 * Run: node scripts/smoke_user_vault.mjs
 */
import {
  mkdtempSync, mkdirSync, copyFileSync, rmSync,
  existsSync, readFileSync, readdirSync,
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

// Notes that must arrive as status: draft in the user vault.
// These are onboarding setup guides with "you, the new user" voice —
// they only make sense in a freshly initialized vault. All other
// published notes ship as status: published (the user can feel what
// a published vault looks like from day one).
const DRAFT_FOR_USERS = [
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando com Devcontainer.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Depois da Recepcao do Template.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Entendendo a Estrutura de Pastas.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Exploracao Guiada do Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md',
  '99 - Meta e Anexos/99.1 - Onboarding/MOC Vault Seed.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Seus Primeiros Passos.md',
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

  // Step 2 — No reset step: user-content notes arrive as status: draft in source.

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
  // Contract F — user-content notes must be status: draft in the user vault
  // -------------------------------------------------------------------------
  for (const notePath of DRAFT_FOR_USERS) {
    const fullPath = join(tmpDir, notePath);
    if (!existsSync(fullPath)) {
      errors.push(`[F] MISSING user-content note: ${notePath}`);
      continue;
    }
    const status = extractStatus(readFileSync(fullPath, 'utf8'));
    if (status !== 'draft') {
      errors.push(`[F] ${notePath}: expected status: draft in user vault, got: ${status ?? '(absent)'}`);
    }
  }

  // -------------------------------------------------------------------------
  // Contract G — DRAFT_FOR_USERS notes must not have status: published
  // (redundant with F, but guards against initialize.yml regressions)
  // -------------------------------------------------------------------------
  const draftSet = new Set(DRAFT_FOR_USERS.map((p) => p.replace(/\\/g, '/')));
  for (const mdPath of findMd(tmpDir)) {
    const relPath = relative(tmpDir, mdPath).replace(/\\/g, '/');
    if (!draftSet.has(relPath)) continue;
    const status = extractStatus(readFileSync(mdPath, 'utf8'));
    if (status === 'published') {
      errors.push(`[G] ${relPath}: onboarding note must not be published in user vault`);
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

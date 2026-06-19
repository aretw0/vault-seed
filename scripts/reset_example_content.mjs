#!/usr/bin/env node
/**
 * Reset example vault notes to draft status.
 *
 * - 40 - Recursos/   → status: draft, remove outbox/channels/publicationStatus/canonical_url/published_at
 * - 99 - Meta e Anexos/ → remove outbox/channels only (keep status: published — these are guides)
 *
 * Run once during development, not part of CI.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const PUBLICATION_FIELDS = ['outbox', 'channels', 'publicationStatus', 'canonical_url', 'published_at'];

/**
 * Parse the YAML frontmatter block from a Markdown string.
 * Returns { pre, frontmatter, body } where pre is everything before the first ---,
 * frontmatter is the raw YAML lines, body is everything after the closing ---.
 */
function splitFrontmatter(content) {
  // BOM-safe: strip ﻿ if present
  const raw = content.startsWith('﻿') ? content.slice(1) : content;
  const lines = raw.split('\n');
  if (lines[0].trim() !== '---') return null;
  const closeIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (closeIdx === -1) return null;
  return {
    hasBOM: content.startsWith('﻿'),
    fm: lines.slice(1, closeIdx),
    body: lines.slice(closeIdx + 1).join('\n'),
  };
}

/**
 * Remove specified top-level YAML keys (including multi-line list values).
 */
function removeKeys(fmLines, keys) {
  const result = [];
  let skipUntilNextKey = false;
  for (const line of fmLines) {
    const isTopKey = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(line);
    const keyName = isTopKey ? line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/)?.[1] : null;
    if (isTopKey) {
      skipUntilNextKey = keys.includes(keyName);
    }
    if (!skipUntilNextKey) result.push(line);
  }
  return result;
}

/**
 * Replace status value (ready/published) with draft.
 */
function setStatusDraft(fmLines) {
  return fmLines.map((line) => {
    if (/^status\s*:\s*(published|ready)\s*$/.test(line)) {
      return 'status: draft';
    }
    return line;
  });
}

function processFile(filePath, { demoteStatus }) {
  const content = readFileSync(filePath, 'utf8');
  const parts = splitFrontmatter(content);
  if (!parts) return false;

  let { fm } = parts;
  const originalFm = fm.join('\n');

  fm = removeKeys(fm, PUBLICATION_FIELDS);
  if (demoteStatus) {
    fm = setStatusDraft(fm);
  }

  if (fm.join('\n') === originalFm) return false;

  const bom = parts.hasBOM ? '﻿' : '';
  const newContent = `${bom}---\n${fm.join('\n')}\n---\n${parts.body}`;
  writeFileSync(filePath, newContent, 'utf8');
  return true;
}

function walkMd(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...walkMd(full));
    else if (e.isFile() && e.name.endsWith('.md')) files.push(full);
  }
  return files;
}

let changed = 0;
let checked = 0;

// 40 - Recursos: demote status + remove publication fields
for (const file of walkMd(join(root, '40 - Recursos'))) {
  checked++;
  if (processFile(file, { demoteStatus: true })) {
    console.log(`  draft  ${file.replace(root, '').replace(/\\/g, '/')}`);
    changed++;
  }
}

// 99 - Meta e Anexos: remove outbox/channels only (status stays published)
for (const file of walkMd(join(root, '99 - Meta e Anexos'))) {
  checked++;
  if (processFile(file, { demoteStatus: false })) {
    console.log(`  clean  ${file.replace(root, '').replace(/\\/g, '/')}`);
    changed++;
  }
}

console.log(`\nChecked ${checked} files, modified ${changed}.`);

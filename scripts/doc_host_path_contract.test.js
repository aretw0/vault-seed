const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = process.cwd();

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function isIgnoredDirectory(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some((part) => ['node_modules', '.git', '.pnpm', '.sandbox', '.claude'].includes(part));
}

function listMarkdownFiles(startPaths) {
  const files = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(dir, entry.name);
      const rel = path.relative(REPO_ROOT, candidate);
      if (rel.startsWith('..')) continue;
      if (isIgnoredDirectory(candidate)) continue;

      if (entry.isDirectory()) {
        walk(candidate);
        continue;
      }

      if (entry.isFile() && candidate.endsWith('.md')) {
        const rel = path.relative(REPO_ROOT, candidate);
        const split = rel.split(path.sep);

        // Exclude design artifacts that are intentionally historical and can keep
        // implementation-specific shell examples.
        if (split.includes('superpowers')) continue;
        files.push(candidate);
        continue;
      }
    }
  };

  for (const start of startPaths) {
    const abs = path.resolve(start);
    if (!abs.startsWith(REPO_ROOT)) continue;

    if (fs.statSync(abs).isDirectory()) {
      walk(abs);
    } else {
      const rel = path.relative(REPO_ROOT, abs);
      if (isIgnoredDirectory(abs)) continue;
      files.push(abs);
    }
  }

  return [...new Set(files)].sort();
}

function markdownLinksToTargets(content) {
  const targetRe = /\[[^\]]*]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)/g;
  const matches = [];
  let match;
  while ((match = targetRe.exec(content)) !== null) {
    matches.push({ target: match[1], index: match.index });
  }
  return matches;
}

function isLocalFilesystemAbsolute(target) {
  if (!target) return false;

  if (/^[A-Za-z]:\\/.test(target)) return true;
  if (/^[A-Za-z]:\//.test(target)) return true;
  if (/^\\\\/.test(target)) return true;
  if (/^\/(Users|home|mnt|tmp|var|opt)\//.test(target)) return true;
  if (target.startsWith('file:///')) return true;
  if (target.includes('\n')) return false;

  // Keep remote schemes and in-page anchors explicit to avoid false positives.
  if (/^(https?:|mailto:|#)/.test(target)) return false;

  // Heuristic fallback for plain filesystem-like tokens.
  if (/^\/.+/.test(target) && target.includes('.')) return false;
  return false;
}

function detectHostPathLines(content) {
  const lines = content.split(/\r?\n/);
  const findings = [];

  for (const [lineNumber, line] of lines.entries()) {
    const lower = line.toLowerCase();

    if (/(?:^|\s)[a-z]:\\/.test(line)) {
      findings.push({ line: lineNumber + 1, text: line.trim(), reason: 'windows-absolute-path' });
      continue;
    }

    if (/(?:^|\s)\/(?:users|home|mnt|tmp|var|opt)\//.test(lower)) {
      findings.push({ line: lineNumber + 1, text: line.trim(), reason: 'unix-absolute-path' });
      continue;
    }

    for (const { target } of markdownLinksToTargets(line)) {
      if (target.startsWith('file:///') || isLocalFilesystemAbsolute(target)) {
        findings.push({ line: lineNumber + 1, text: line.trim(), reason: `markdown-link:${target}` });
      }
    }
  }

  return findings;
}


test('docs avoid host filesystem absolute paths outside the repository', () => {
  const scannedPaths = listMarkdownFiles([
    'README.md',
    'README.template.md',
    'AGENTS.md',
    'ROADMAP.md',
    'docs',
    '99 - Meta e Anexos',
    'docs',
  ]);

  const leaks = [];

  for (const file of scannedPaths) {
    const rel = path.relative(REPO_ROOT, file);
    const content = readFile(file);
    const findings = detectHostPathLines(content);
    if (findings.length > 0) {
      leaks.push(
        ...findings.map((f) => ({
          file: rel,
          ...f,
        })),
      );
    }
  }

  assert.equal(
    leaks.length,
    0,
    `Found host paths in docs that should be remote references or template placeholders:\n${JSON.stringify(
      leaks,
      null,
      2,
    )}`,
  );
});

// Keep generated docs scoped to project-local files that can run in browser/runtime,
// and do not enforce path policy on those helper paths.

test('docs only mention allowed aretw0-scope in user-facing docs', () => {
  const scannedPaths = listMarkdownFiles(['docs', '99 - Meta e Anexos']);
  const allowedAretw0 = /@aretw0\/[A-Za-z0-9_.-]+/;
  const findings = [];

  for (const file of scannedPaths) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = readFile(file).split(/\r?\n/);

    lines.forEach((line, index) => {
      const occurrences = line.match(/@aretw0/g);
      if (!occurrences) return;

      const hasAllowed = line.split(/\s+/).some((token) => allowedAretw0.test(token));
      const hasPlainAretw0Path = /\baretw0\b/.test(line);
      if (!hasAllowed && hasPlainAretw0Path) {
        findings.push({
          file: rel,
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }

  assert.equal(
    findings.length,
    0,
    `Found bare aretw0 mentions outside scoped forms:\n${JSON.stringify(findings, null, 2)}`,
  );
});

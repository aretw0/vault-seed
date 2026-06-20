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

    // Relative checkout of a sibling project — the maintainer's local layout is
    // not a contract of the template, so docs must not assume a path to it.
    // Strip URLs first so https://github.com/<owner>/<repo> links don't trip it.
    const withoutUrls = line.replace(/https?:\/\/\S+/g, '');
    if (/\.\.[\\/](?:[\w.-]+[\\/])*(?:agents-lab|refarm)\b/i.test(withoutUrls)) {
      findings.push({ line: lineNumber + 1, text: line.trim(), reason: 'relative-sibling-checkout' });
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

// Regression guard for the discourse leaks that survived the absolute-path and
// audience checks: a sibling-project checkout stated as a relative path, and
// work-identifying internal references (a department acronym, an internal
// taxonomy/package name). The detector itself is exercised here so the guard
// cannot silently rot.
test('host-path detector flags relative sibling checkouts but not github links', () => {
  const sibling = detectHostPathLines('Veja `../../agents-lab` para detalhes.');
  assert.equal(sibling.length, 1, 'relative sibling checkout should be flagged');
  assert.equal(sibling[0].reason, 'relative-sibling-checkout');

  const githubLink = detectHostPathLines('[`agents-lab`](https://github.com/aretw0/agents-lab) é outro projeto.');
  assert.equal(githubLink.length, 0, 'a github.com link to the project must not be flagged');

  const plainName = detectHostPathLines('Use o `agents-lab` como incubadora.');
  assert.equal(plainName.length, 0, 'mentioning the project by name is allowed');
});

const SOURCE_EXTENSIONS = new Set([
  '.md', '.mjs', '.cjs', '.js', '.ts', '.astro', '.json', '.py', '.yml', '.yaml', '.sh',
]);

const SKIP_SOURCE_FILES = new Set([
  'pnpm-lock.yaml',
  'pnpm-lock.template.yaml',
  'package-lock.json',
]);

// High-confidence work-identifying tokens with zero legitimate use in a public
// DGK template. Stored base64-encoded ON PURPOSE so the plaintext does not
// re-enter this public repository — inlining the decoded strings would defeat
// the guard. Kept narrow to avoid false positives on ordinary prose.
const decodeToken = (b64) => Buffer.from(b64, 'base64').toString('utf8');
const INTERNAL_TOKENS = {
  acronym: decodeToken('cmNkYw=='),
  acronymFull: decodeToken('cmNkYzU='),
  scope: decodeToken('cmNkY3A='),
  taxonomy: decodeToken('cm0tdGF4b25vbXk='),
  workVault: decodeToken('am9iLXZhdWx0'),
};
const FORBIDDEN_INTERNAL = [
  { re: new RegExp('\\b' + INTERNAL_TOKENS.acronym + '\\w*', 'i'), label: 'internal department acronym' },
  { re: new RegExp(INTERNAL_TOKENS.taxonomy, 'i'), label: 'internal taxonomy name' },
  { re: new RegExp('@' + INTERNAL_TOKENS.scope + '\\b', 'i'), label: 'internal package scope' },
  { re: new RegExp('\\b' + INTERNAL_TOKENS.workVault + '[\\w-]*', 'i'), label: 'internal work vault name' },
];

function listSourceFiles() {
  const files = [];
  const thisFile = path.resolve(__filename);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const candidate = path.join(dir, entry.name);
      if (isIgnoredDirectory(candidate)) continue;
      if (['dist', 'build', '.astro', 'coverage', '.changeset'].includes(entry.name)) continue;
      if (entry.isDirectory()) {
        walk(candidate);
        continue;
      }
      if (!entry.isFile()) continue;
      if (path.resolve(candidate) === thisFile) continue; // this file holds the denylist
      if (SKIP_SOURCE_FILES.has(entry.name)) continue;
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
      // Authored references live in source/docs (small). Skip large generated
      // blobs (vault data, datasets) to keep the gate fast.
      if (fs.statSync(candidate).size > 256 * 1024) continue;
      files.push(candidate);
    }
  };
  walk(REPO_ROOT);
  return files;
}

test('internal-reference denylist matches the known leak shapes', () => {
  // Built from the encoded tokens so this file carries no sensitive plaintext.
  const samples = [
    `Padrão portado do motor @${INTERNAL_TOKENS.scope}/engine (${INTERNAL_TOKENS.acronymFull}/packages/engine).`,
    `espelha o sistema de taxonomia do ${INTERNAL_TOKENS.acronymFull} (\`${INTERNAL_TOKENS.taxonomy}\`)`,
  ];
  for (const sample of samples) {
    assert.ok(
      FORBIDDEN_INTERNAL.some(({ re }) => re.test(sample)),
      `denylist should flag: ${sample}`,
    );
  }
  // Ordinary prose must stay clean.
  assert.ok(
    !FORBIDDEN_INTERNAL.some(({ re }) => re.test('O vault-seed usa frontmatter YAML padrão.')),
    'denylist must not flag ordinary prose',
  );
});

test('repository source avoids work-identifying internal references', () => {
  const leaks = [];

  for (const file of listSourceFiles()) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = readFile(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { re, label } of FORBIDDEN_INTERNAL) {
        if (re.test(line)) {
          leaks.push({ file: rel, line: index + 1, label, text: line.trim() });
        }
      }
    });
  }

  assert.equal(
    leaks.length,
    0,
    `Found internal work-identifying references that must stay out of the public template:\n${JSON.stringify(
      leaks,
      null,
      2,
    )}`,
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { scanText, stripNonProse, summarizeIssues } = require('./check_pt_text.js');

test('Portuguese drift scanner scores every prose accent issue deterministically', () => {
  const issues = scanText('O usuario nao viu a documentacao.\nA versao tambem mudou.\n', {
    file: 'README.md',
    scope: 'entrypoints',
  });

  assert.deepEqual(
    issues.map((issue) => [issue.ruleId, issue.line, issue.column, issue.weight]),
    [
      ['usuario', 1, 3, 1],
      ['nao', 1, 11, 1],
      ['documentacao', 1, 21, 1],
      ['versao', 2, 3, 1],
      ['tambem', 2, 10, 1],
    ],
  );

  const summary = summarizeIssues(issues);
  assert.equal(summary.byScope.entrypoints.score, 5);
  assert.equal(summary.byRule.usuario.score, 1);
});

test('Portuguese drift scanner blanks code, frontmatter, wikilinks and Astro internals', () => {
  const text = `---
category: referencia
tags:
  - meta/automacao
---

[[Publicacao]]

\`usuario\`

\`\`\`bash
nao documentacao
\`\`\`

<script>const usuario = 'nao';</script>
<style>.documentacao { color: red; }</style>
<p>usuario nao</p>
`;

  const stripped = stripNonProse(text, 'example.astro');
  assert.doesNotMatch(stripped, /category: referencia/);
  assert.doesNotMatch(stripped, /const usuario/);
  assert.doesNotMatch(stripped, /\.documentacao/);

  const issues = scanText(text, { file: 'example.astro', scope: 'site' });
  assert.deepEqual(
    issues.map((issue) => issue.ruleId),
    ['usuario', 'nao'],
  );
});

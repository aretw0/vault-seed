import { test, expect } from "vitest";
import { scanText, stripNonProse, summarizeIssues } from "./check_pt_text.js";


test('Portuguese drift scanner scores every prose accent issue deterministically', () => {
  const issues = scanText('O usuario nao viu a documentacao.\nA versao tambem mudou.\n', {
    file: 'README.md',
    scope: 'entrypoints',
  });

  expect(issues.map((issue) => [issue.ruleId, issue.line, issue.column, issue.weight])).toEqual([
      ['usuario', 1, 3, 1],
      ['nao', 1, 11, 1],
      ['documentacao', 1, 21, 1],
      ['versao', 2, 3, 1],
      ['tambem', 2, 10, 1],
    ]);

  const summary = summarizeIssues(issues);
  expect(summary.byScope.entrypoints.score).toBe(5);
  expect(summary.byRule.usuario.score).toBe(1);
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
  expect(stripped).not.toMatch(/category: referencia/);
  expect(stripped).not.toMatch(/const usuario/);
  expect(stripped).not.toMatch(/\.documentacao/);

  const issues = scanText(text, { file: 'example.astro', scope: 'site' });
  expect(issues.map((issue) => issue.ruleId)).toEqual(['usuario', 'nao']);
});

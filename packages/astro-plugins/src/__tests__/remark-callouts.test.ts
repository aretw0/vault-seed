import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkCallouts from '../remark-callouts.js';

async function html(md: string) {
  const f = await remark()
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(f);
}

describe('remarkCallouts', () => {
  it('converts Obsidian blockquote callout to aside element', async () => {
    const out = await html('> [!NOTE]\n> Conteúdo da nota.');
    expect(out).toContain('<aside');
    expect(out).toContain('callout-note');
  });

  it('uses custom title when provided', async () => {
    const out = await html('> [!WARNING] Atenção!\n> Texto.');
    expect(out).toContain('aria-label="Atenção!"');
    expect(out).toContain('callout-warning');
  });

  it('normalizes type aliases', async () => {
    const out = await html('> [!HINT]\n> Dica.');
    expect(out).toContain('callout-tip');
  });

  it('does not transform regular blockquotes', async () => {
    const out = await html('> Citação normal sem callout.');
    expect(out).not.toContain('<aside');
    expect(out).toContain('<blockquote>');
  });
});

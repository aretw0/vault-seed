import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkWikiLinks from '../remark-wiki-links.js';

const published = new Set(['recursos/o-que-e-para', 'projetos/viagem']);

async function html(md: string, base = '') {
  const f = await remark()
    .use(remarkWikiLinks, { publishedSlugs: published, base })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  return String(f);
}

describe('remarkWikiLinks', () => {
  it('converts published wikilink to anchor', async () => {
    const out = await html('Veja [[O que é PARA]].');
    expect(out).toContain('<a href="/recursos/o-que-e-para">O que é PARA</a>');
  });

  it('converts private wikilink to plain text', async () => {
    const out = await html('Veja [[Nota Privada]].');
    expect(out).not.toContain('<a');
    expect(out).toContain('Nota Privada');
  });

  it('uses alias as link text for published note', async () => {
    const out = await html('Leia [[O que é PARA|método PARA]].');
    expect(out).toContain('<a href="/recursos/o-que-e-para">método PARA</a>');
  });

  it('uses alias as plain text for private note', async () => {
    const out = await html('Leia [[Privado|meu alias]].');
    expect(out).not.toContain('<a');
    expect(out).toContain('meu alias');
  });

  it('applies base prefix to href', async () => {
    const out = await html('[[O que é PARA]]', '/meu-vault');
    expect(out).toContain('href="/meu-vault/recursos/o-que-e-para"');
  });

  it('leaves regular markdown unmodified', async () => {
    const out = await html('Texto sem wikilinks.');
    expect(out).toContain('Texto sem wikilinks.');
    expect(out).not.toContain('<a');
  });
});

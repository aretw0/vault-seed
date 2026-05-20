import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkWikiImages from '../remark-wiki-images.js';

async function html(md: string, base = '') {
  const f = await remark()
    .use(remarkWikiImages, { base })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(f);
}

describe('remarkWikiImages', () => {
  it('converts wiki image embed to img tag with lazy loading', async () => {
    const out = await html('![[foto.png]]');
    expect(out).toContain('src="/assets/foto.png"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('alt="foto"');
  });

  it('uses explicit alt text when pipe syntax used', async () => {
    const out = await html('![[foto.png|Minha foto de viagem]]');
    expect(out).toContain('alt="Minha foto de viagem"');
  });

  it('applies base path to src', async () => {
    const out = await html('![[foto.png]]', '/meu-vault');
    expect(out).toContain('src="/meu-vault/assets/foto.png"');
  });

  it('does not transform standard markdown images', async () => {
    const out = await html('![alt](image.png)');
    expect(out).toContain('src="image.png"');
    expect(out).not.toContain('/assets/');
  });
});

// .site/integrations/collect-published-slugs.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

export async function collectPublishedSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>();
  const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
  const files = globSync(patterns, { cwd: process.cwd() });

  for (const file of files) {
    const raw = readFileSync(join(process.cwd(), file), 'utf-8');
    const { data } = matter(raw);
    if (data.status === 'published') {
      slugs.add(slugify(file.replace(/\\/g, '/').replace(/\.md$/, '')));
    }
  }

  return slugs;
}

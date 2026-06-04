// .site/integrations/collect-published-slugs.ts
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@aretw0/dgk-astro-plugins';
import { readTechnicalDocEntries } from './technical-docs.js';
import { VAULT_FOLDERS } from './vault-config.js';

export interface VaultEntry {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  sourcePath?: string;
  folder?: string;
}

/** Returns all published vault entries with their full frontmatter data. */
export async function collectVaultEntries(): Promise<VaultEntry[]> {
  const entries: VaultEntry[] = [];
  const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
  const files = globSync(patterns, { cwd: process.cwd() });

  for (const file of files) {
    const raw = readFileSync(join(process.cwd(), file), 'utf-8');
    const { data } = matter(raw);
    if (data.status !== 'published') continue;

    // Normalize to forward slashes before slugifying (glob may return OS-native separators).
    const normalizedFile = file.replace(/\\/g, '/');
    const slug = slugify(normalizedFile.replace(/\.md$/, ''));
    const title = (data.title as string | undefined) ?? basename(file, '.md');
    entries.push({
      slug,
      title,
      data,
      sourcePath: normalizedFile,
      folder: normalizedFile.split('/')[0] ?? '',
    });
  }

  for (const entry of readTechnicalDocEntries()) {
    entries.push({ slug: entry.slug, title: entry.title, data: entry.data });
  }

  return entries;
}

/** Returns a Set of published slugs (backward-compatible helper). */
export async function collectPublishedSlugs(): Promise<Set<string>> {
  const entries = await collectVaultEntries();
  return new Set(entries.map(e => e.slug));
}

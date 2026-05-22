// .site/integrations/generate-vault-json.ts
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';
import type { AstroIntegration } from 'astro';
import { VAULT_FOLDERS } from './vault-config.js';

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

export interface VaultNote {
  id: string;
  title: string;
  folder: string;
  status: string | null;
  tags: string[];
  links: string[];
  created: string | null;
  updated: string | null;
}

function extractLinks(content: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}

export function generateVaultJson(): AstroIntegration {
  return {
    name: 'generate-vault-json',
    hooks: {
      'astro:build:start': ({ logger }) => {
        try {
          const notebooksPath = process.env.VAULT_NOTEBOOKS_PATH ?? 'lab';
          const cwd = process.cwd();
          const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
          const files = globSync(patterns, { cwd });

          const notes: VaultNote[] = [];

          for (const file of files) {
            const fullPath = join(cwd, file);
            const raw = readFileSync(fullPath, 'utf-8');
            const { data, content } = matter(raw);

            // Normalize path separators before slugifying
            const id = slugify(file.replace(/\\/g, '/').replace(/\.md$/, ''));
            const title = (data.title as string | undefined) ?? basename(file, '.md');

            // Derive the top-level folder name (e.g. "20 - Projetos")
            const folder = file.replace(/\\/g, '/').split('/')[0] ?? '';

            const status = (data.status as string | undefined) ?? null;

            const rawTags = data.tags;
            const tags: string[] = Array.isArray(rawTags)
              ? rawTags.map(String)
              : typeof rawTags === 'string'
                ? [rawTags]
                : [];

            const links = extractLinks(content);

            const created = data.created
              ? String(data.created)
              : null;
            const updated = data.updated
              ? String(data.updated)
              : null;

            notes.push({ id, title, folder, status, tags, links, created, updated });
          }

          const outDir = join(cwd, 'public', notebooksPath);
          mkdirSync(outDir, { recursive: true });
          writeFileSync(join(outDir, 'vault-data.json'), JSON.stringify(notes, null, 2), 'utf-8');

          logger.info(`vault-data.json: ${notes.length} notas escritas`);
        } catch (err) {
          logger.error(err instanceof Error ? err.message : String(err));
          throw err;
        }
      },
    },
  };
}

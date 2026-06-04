// .site/integrations/technical-docs.ts
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@aretw0/dgk-astro-plugins';

const TECHNICAL_DOCS_ROOT = 'docs';
const TECHNICAL_DOCS_INDEX = `${TECHNICAL_DOCS_ROOT}/INDEX.md`;

export interface TechnicalDocEntry {
  slug: string;
  title: string;
  file: string;
  fullPath: string;
  data: Record<string, unknown>;
  content: string;
}

export function shouldIncludeTechnicalDocs(root = process.cwd()): boolean {
  return (
    process.env.VAULT_SEED_TECHNICAL_DOCS !== '0' &&
    existsSync(join(root, TECHNICAL_DOCS_INDEX))
  );
}

function titleFromMarkdown(content: string, file: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || basename(file, '.md');
}

function siteBase(): string {
  return (process.env.ASTRO_BASE ?? '').replace(/\/$/, '');
}

function absoluteSitePath(slug: string, hash = ''): string {
  return `${siteBase()}/${slug}/${hash}`.replace(/\/\//g, '/');
}

function slugFromTechnicalDoc(file: string): string {
  const normalized = file.replace(/\\/g, '/');
  if (normalized === TECHNICAL_DOCS_INDEX) return TECHNICAL_DOCS_ROOT;
  return slugify(normalized.replace(/\.md$/, ''));
}

function stripRelativePrefix(target: string): string {
  return target.replace(/^(\.\/|\.\.\/)+/, '');
}

function slugFromMarkdownTarget(target: string): string {
  const decoded = decodeURIComponent(stripRelativePrefix(target));
  const normalized = decoded.replace(/\\/g, '/').replace(/\.md$/, '');

  if (normalized.startsWith(`${TECHNICAL_DOCS_ROOT}/`)) {
    return slugify(normalized);
  }

  if (normalized.includes('/')) {
    return slugify(normalized);
  }

  return `${TECHNICAL_DOCS_ROOT}/${slugify(normalized)}`;
}

export function normalizeTechnicalDocLinks(content: string): string {
  return content.replace(
    /\]\((?!https?:|mailto:|#|\/)([^)\s?#]+\.md)(#[^)]+)?\)/g,
    (_match, target: string, hash = '') => `](${absoluteSitePath(slugFromMarkdownTarget(target), hash)})`,
  );
}

export function readTechnicalDocEntries(root = process.cwd()): TechnicalDocEntry[] {
  if (!shouldIncludeTechnicalDocs(root)) return [];

  return globSync(`${TECHNICAL_DOCS_ROOT}/**/*.md`, {
    cwd: root,
    ignore: [`${TECHNICAL_DOCS_ROOT}/superpowers/**`],
  })
    .sort((a, b) => {
      if (a === TECHNICAL_DOCS_INDEX) return -1;
      if (b === TECHNICAL_DOCS_INDEX) return 1;
      return a.localeCompare(b, 'pt');
    })
    .map((file, index) => {
      const fullPath = join(root, file);
      const raw = readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      const title = typeof data.title === 'string' ? data.title : titleFromMarkdown(content, file);
      return {
        slug: slugFromTechnicalDoc(file),
        title,
        file,
        fullPath,
        data: {
          ...data,
          category: data.category ?? 'docs-tecnicas',
          audience: data.audience ?? 'mantenedores',
          sidebar: {
            order: index + 1,
            ...(typeof data.sidebar === 'object' && data.sidebar !== null ? data.sidebar : {}),
          },
        },
        content: normalizeTechnicalDocLinks(content),
      };
    });
}

// .site/content.config.ts
import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@aretw0/dgk-astro-plugins';
import { readTechnicalDocEntries } from './integrations/technical-docs.js';
import { VAULT_FOLDERS } from './lib/vault-folders.mjs';

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function renderMetaBadges(data: Record<string, unknown>): string {
  const tags = normalizeList(data.tags);
  const properties = [
    ['status', data.status],
    ['categoria', data.category],
    ['público', data.audience],
  ].filter(([, value]) => typeof value === 'string' && value.trim().length > 0);

  if (tags.length === 0 && properties.length === 0) {
    return '';
  }

  const tagBadges = tags
    .map((tag) => `<span class="vault-badge vault-badge--tag">#${escapeHtml(tag)}</span>`)
    .join('');
  const propertyBadges = properties
    .map(
      ([label, value]) =>
        `<span class="vault-badge vault-badge--property"><span class="vault-badge__label">${escapeHtml(label)}</span>${escapeHtml(value)}</span>`,
    )
    .join('');

  return `<aside class="vault-meta-badges" aria-label="Metadados da nota">${tagBadges}${propertyBadges}</aside>`;
}

export const collections = {
  docs: defineCollection({
    loader: {
      name: 'vault-loader',
      load: async ({ store, logger, renderMarkdown }: { store: any; logger: any; renderMarkdown: any }) => {
        store.clear();

        const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
        const files = globSync(patterns, { cwd: process.cwd() });
        let count = 0;

        for (const file of files) {
          const fullPath = join(process.cwd(), file);
          const raw = readFileSync(fullPath, 'utf-8');
          const { data, content } = matter(raw);

          if (data.status !== 'published') continue;

          // Normalize to forward slashes before slugifying (glob may return OS-native separators).
          const id = slugify(file.replace(/\\/g, '/').replace(/\.md$/, ''));
          const title: string = data.title ?? basename(file, '.md');

          // js-yaml parses unquoted YAML dates (e.g. 2023-10-27) as Date objects;
          // stringify them before storing to avoid Zod schema failures.
          const safeData: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(data)) {
            safeData[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
          }

          // Strip a leading H1 heading from the body: Starlight already renders
          // an <h1> from the frontmatter `title`, so the markdown # Title would
          // create a visible duplicate on the page.
          // \s* handles leading blank lines that matter() may leave after the
          // frontmatter block. (?!#) ensures we only strip H1, not ## or ###.
          const body = content.replace(/^\s*#(?!#)[^\n]*\n?/, '').trimStart();

          // Render markdown through Astro's pipeline (applies all remark plugins:
          // remarkCallouts, remarkWikiImages, remarkWikiLinks).
          // Custom loaders do NOT auto-process body — renderMarkdown must be called explicitly.
          const rendered = await renderMarkdown(`${renderMetaBadges(safeData)}\n\n${body}`, {
            fileURL: pathToFileURL(fullPath),
          });

          store.set({
            id,
            data: {
              ...safeData,
              title,
              // Starlight reads raw store data directly — apply schema defaults explicitly.
              draft: false,
              head: [],
              editUrl: true,
              template: 'doc',
              pagefind: true,
              // Preserve frontmatter sidebar fields (order, label, hidden) —
              // spread user values over defaults so per-note overrides work.
              sidebar: { hidden: false, attrs: {}, ...(safeData.sidebar as object ?? {}) },
            },
            body,
            // Synthetic relative path so Starlight's sidebar autogenerate can strip the
            // collection prefix ('.site/content/docs/') and match against directory names.
            // The real vault file path is passed to renderMarkdown via fileURL instead.
            filePath: `.site/content/docs/${id}.md`,
            rendered,
          });
          count++;
        }

        for (const entry of readTechnicalDocEntries()) {
          const safeData: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(entry.data)) {
            safeData[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
          }

          const body = entry.content.replace(/^\s*#(?!#)[^\n]*\n?/, '').trimStart();
          const rendered = await renderMarkdown(body, {
            fileURL: pathToFileURL(entry.fullPath),
          });

          store.set({
            id: entry.slug,
            data: {
              ...safeData,
              title: entry.title,
              draft: false,
              head: [],
              editUrl: true,
              template: 'doc',
              pagefind: true,
              sidebar: { hidden: false, attrs: {}, ...(safeData.sidebar as object ?? {}) },
            },
            body,
            filePath: `.site/content/docs/${entry.slug}.md`,
            rendered,
          });
          count++;
        }

        const notFoundBody = 'A página solicitada não existe ou não está publicada.';
        const notFoundRendered = await renderMarkdown(notFoundBody, {
          fileURL: pathToFileURL(join(process.cwd(), '404.md')),
        });
        store.set({
          id: '404',
          data: {
            title: 'Página não encontrada',
            draft: true,
            head: [],
            editUrl: false,
            template: 'doc',
            pagefind: false,
            sidebar: { hidden: true, attrs: {} },
          },
          body: notFoundBody,
          filePath: '.site/content/docs/404.md',
          rendered: notFoundRendered,
        });

        logger.info(`Vault loader: ${count} published notes loaded`);
      },
    },
    schema: docsSchema({
      extend: z.object({
        showGraphView: z.boolean().optional(),
      }),
    }),
  }),
};

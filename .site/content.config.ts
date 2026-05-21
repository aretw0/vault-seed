// .site/content.config.ts
import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

export const collections = {
  docs: defineCollection({
    loader: {
      name: 'vault-loader',
      load: async ({ store, logger, renderMarkdown }: { store: any; logger: any; renderMarkdown: any }) => {
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
          const rendered = await renderMarkdown(body, {
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
              sidebar: { hidden: false, attrs: {} },
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

        logger.info(`Vault loader: ${count} published notes loaded`);
      },
    },
    schema: docsSchema(),
  }),
};

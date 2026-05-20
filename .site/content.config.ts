// .site/content.config.ts
import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
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
      load: async ({ store, logger }: { store: any; logger: any }) => {
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
          },
          body: content,
          filePath: fullPath,
        });
        count++;
      }

      logger.info(`Vault loader: ${count} published notes loaded`);
      },
    },
    schema: docsSchema(),
  }),
};

// .site/content/config.ts
import { defineCollection, z } from 'astro:content';
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
    loader: async ({ store, logger }: { store: any; logger: any }) => {
      const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
      const files = globSync(patterns, { cwd: process.cwd() });
      let count = 0;

      for (const file of files) {
        const fullPath = join(process.cwd(), file);
        const raw = readFileSync(fullPath, 'utf-8');
        const { data, content } = matter(raw);

        if (data.status !== 'published') continue;

        const id = slugify(file.replace(/\.md$/, ''));
        const title: string = data.title ?? basename(file, '.md');

        store.set({
          id,
          data: { ...data, title },
          body: content,
        });
        count++;
      }

      logger.info(`Vault loader: ${count} published notes loaded`);
    },
    schema: docsSchema({
      extend: z.object({
        status: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        category: z.string().optional(),
        audience: z.string().optional(),
        related: z.array(z.string()).optional(),
      }),
    }),
  }),
};

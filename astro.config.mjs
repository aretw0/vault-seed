// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkCallouts, remarkWikiImages, remarkWikiLinks } from '@dgk/astro-plugins';
import { collectPublishedSlugs } from './.site/integrations/collect-published-slugs.js';

const site = process.env.ASTRO_SITE ?? 'https://username.github.io';
const base = process.env.ASTRO_BASE ?? '/vault-name';
const publishedSlugs = await collectPublishedSlugs();

export default defineConfig({
  srcDir: '.site',
  site,
  base,
  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkCallouts,
      [remarkWikiImages, { base }],
      [remarkWikiLinks, { publishedSlugs, base }],
    ],
  },
  integrations: [
    starlight({
      title: process.env.VAULT_TITLE ?? 'Meu Vault',
      defaultLocale: 'pt-BR',
      social: process.env.GITHUB_REPOSITORY
        ? [{ icon: 'github', label: 'GitHub', href: `https://github.com/${process.env.GITHUB_REPOSITORY}` }]
        : [],
      sidebar: [
        { label: 'Recursos',      autogenerate: { directory: 'recursos' } },
        { label: 'Projetos',      autogenerate: { directory: 'projetos' } },
        { label: 'Áreas',         autogenerate: { directory: 'areas' } },
        { label: 'Meta',          autogenerate: { directory: 'meta-e-anexos' } },
      ],
      customCss: ['./.site/styles/custom.css'],
    }),
  ],
});

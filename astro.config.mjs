// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkCallouts, remarkWikiImages, remarkWikiLinks } from '@dgk/astro-plugins';
import { collectPublishedSlugs } from './.site/integrations/collect-published-slugs.js';

const site = process.env.ASTRO_SITE;
const base = process.env.ASTRO_BASE ?? '/';

// Title: explicit env var → repo name from GitHub context → cwd basename
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  ?? process.cwd().split(/[\\/]/).pop()
  ?? 'Meu Vault';
const vaultTitle = process.env.VAULT_TITLE ?? repoName;
const publishedSlugs = await collectPublishedSlugs();

// Sidebar sections are only shown when at least one published note lives in
// that directory. Empty sections disappear automatically; they reappear as
// soon as the user publishes a note there.
const SIDEBAR_SECTIONS = [
  { label: 'Recursos', directory: 'recursos' },
  { label: 'Projetos', directory: 'projetos' },
  { label: 'Áreas',    directory: 'areas' },
  { label: 'Meta',     directory: 'meta-e-anexos' },
];
const sidebar = SIDEBAR_SECTIONS
  .filter(({ directory }) => [...publishedSlugs].some(s => s.startsWith(directory + '/')))
  .map(({ label, directory }) => ({
    label,
    items: [{ autogenerate: { directory } }],
  }));

// Client-side mermaid rendering.  Expressive Code keeps the copy button and
// syntax highlighting intact; after page load we replace the <figure> with
// the rendered SVG.  Re-fires on astro:page-load to handle View Transitions.
const mermaidScript = `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
async function renderMermaid() {
  const dark = document.documentElement.dataset.theme === 'dark';
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral' });
  for (const pre of document.querySelectorAll('pre[data-language="mermaid"]')) {
    const wrap = pre.closest('figure') ?? pre;
    try {
      const { svg } = await mermaid.render('mmd' + Math.random().toString(36).slice(2), pre.textContent.trim());
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      div.innerHTML = svg;
      wrap.replaceWith(div);
    } catch(e) { console.warn('[mermaid]', e); }
  }
}
document.addEventListener('DOMContentLoaded', renderMermaid);
document.addEventListener('astro:page-load', renderMermaid);
`.trim();

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
      title: vaultTitle,
      defaultLocale: 'pt-BR',
      social: process.env.GITHUB_REPOSITORY
        ? [{ icon: 'github', label: 'GitHub', href: `https://github.com/${process.env.GITHUB_REPOSITORY}` }]
        : [],
      sidebar,
      head: [
        { tag: 'script', attrs: { type: 'module' }, content: mermaidScript },
      ],
      customCss: ['./.site/styles/custom.css'],
    }),
  ],
});

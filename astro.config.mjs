// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkCallouts, remarkWikiImages, remarkWikiLinks } from '@dgk/astro-plugins';
import { collectVaultEntries } from './.site/integrations/collect-published-slugs.js';
import { copyVaultAttachments } from './.site/integrations/copy-vault-attachments.js';
import { sidebarSections } from './.site/sidebar.config.js';

const site = process.env.ASTRO_SITE;
const base = process.env.ASTRO_BASE ?? '/';

// Title: explicit env var → repo name from GitHub context → cwd basename
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  ?? process.cwd().split(/[\\/]/).pop()
  ?? 'Meu Vault';
const vaultTitle = process.env.VAULT_TITLE ?? repoName;

const vaultEntries = await collectVaultEntries();
const publishedSlugs = new Set(vaultEntries.map(e => e.slug));

// Build sidebar from .site/sidebar.config.ts.
// Directory sections use Starlight autogenerate (respects sidebar.order from frontmatter).
// Tag/property sections produce explicit { slug } items sorted by sidebar.order then title.
// Sections with no matching entries are omitted automatically.
function buildSidebarItems(entries) {
  return sidebarSections
    .map(section => {
      if ('directory' in section) {
        const hasEntries = entries.some(e => e.slug.startsWith(section.directory + '/'));
        if (!hasEntries) return null;
        return {
          label: section.label,
          collapsed: section.collapsed,
          items: [{ autogenerate: { directory: section.directory } }],
        };
      }
      const matched = entries.filter(e => {
        if ('tag' in section) {
          const tags = e.data.tags;
          return Array.isArray(tags) && tags.includes(section.tag);
        }
        return e.data[section.property] === section.value;
      });
      if (matched.length === 0) return null;
      const items = matched
        .sort((a, b) => {
          const ao = (a.data.sidebar?.order) ?? 999;
          const bo = (b.data.sidebar?.order) ?? 999;
          return ao !== bo ? ao - bo : a.title.localeCompare(b.title, 'pt');
        })
        .map(e => ({ slug: e.slug }));
      return { label: section.label, collapsed: section.collapsed, items };
    })
    .filter(Boolean);
}
const sidebar = buildSidebarItems(vaultEntries);

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
    const source = pre.textContent.trim();
    try {
      const { svg } = await mermaid.render('mmd' + Math.random().toString(36).slice(2), source);
      // Mermaid may return an error SVG instead of throwing; detect and skip.
      if (svg.includes('Syntax error') || svg.includes('error in text')) {
        console.warn('[mermaid] syntax error in diagram — leaving code block intact');
        continue;
      }
      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      container.innerHTML = svg;
      // Copy button — preserves Mermaid source since Expressive Code toolbar is replaced.
      const btn = document.createElement('button');
      btn.className = 'mermaid-copy-btn';
      btn.setAttribute('aria-label', 'Copiar código Mermaid');
      btn.setAttribute('title', 'Copiar código Mermaid');
      btn.textContent = 'Copiar';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(source).then(() => {
          btn.textContent = 'Copiado!';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
        });
      });
      container.appendChild(btn);
      wrap.replaceWith(container);
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
    copyVaultAttachments(),
    starlight({
      title: vaultTitle,
      // 'root' locale with lang: 'pt-BR' is required for Starlight to use its
      // built-in Portuguese translations. Setting only defaultLocale: 'pt-BR'
      // (bare string, no locales object) is silently ignored and falls back to English.
      locales: {
        root: { label: 'Português (Brasil)', lang: 'pt-BR' },
      },
      social: process.env.GITHUB_REPOSITORY
        ? [{ icon: 'github', label: 'GitHub', href: `https://github.com/${process.env.GITHUB_REPOSITORY}` }]
        : [],
      sidebar,
      head: [
        { tag: 'script', attrs: { type: 'module' }, content: mermaidScript },
      ],
      customCss: [
        './.site/styles/custom.css',
        // Paleta ativa — troque o arquivo para mudar o tema visual:
        // verde-jardim (padrão) · oceano · terracota
        './.site/styles/themes/verde-jardim.css',
      ],
    }),
  ],
});

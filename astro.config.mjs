// astro.config.mjs
import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkCallouts, remarkWikiImages, remarkWikiLinks } from '@dgk/astro-plugins';
import { collectVaultEntries } from './.site/integrations/collect-published-slugs.js';
import { copyVaultAttachments } from './.site/integrations/copy-vault-attachments.js';
import { generateVaultJson } from './.site/integrations/generate-vault-json.js';
import { sidebarSections } from './.site/sidebar.config.js';

const require = createRequire(import.meta.url);
const {
  deriveNoteIntents,
  loadInformationArchitecture,
} = require('./.site/lib/information-architecture.cjs');

const site = process.env.ASTRO_SITE;
const base = process.env.ASTRO_BASE ?? '/';
const informationArchitecture = loadInformationArchitecture();

// Title: explicit env var → repo name from GitHub context → cwd basename
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  ?? process.cwd().split(/[\\/]/).pop()
  ?? 'Meu Vault';
const vaultTitle = process.env.VAULT_TITLE?.trim() || repoName;
const isVaultSeedDemo = process.env.GITHUB_REPOSITORY === 'aretw0/vault-seed' || repoName === 'vault-seed';

process.env.VAULT_THEME_SELECTOR ??= isVaultSeedDemo ? '1' : '0';

const vaultEntries = await collectVaultEntries();
const publishedSlugs = new Set(vaultEntries.map(e => e.slug));

// Build sidebar from .site/sidebar.config.ts.
// Intent sections are backed by .site/information-architecture.json so the
// sidebar, exploration page, and audits share the same vocabulary.
// Directory sections use Starlight autogenerate (respects sidebar.order from frontmatter).
// Tag/property sections produce explicit { slug } items sorted by sidebar.order then title.
// Sections with no matching entries are omitted automatically.
function sortSidebarEntries(entries) {
  return [...entries].sort((a, b) => {
    const ao = (a.data.sidebar?.order) ?? 999;
    const bo = (b.data.sidebar?.order) ?? 999;
    return ao !== bo ? ao - bo : a.title.localeCompare(b.title, 'pt');
  });
}

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
        if ('intent' in section) {
          if (!e.folder) return false;
          return deriveNoteIntents(
            {
              folder: e.folder ?? '',
              tags: Array.isArray(e.data.tags) ? e.data.tags : [],
              category: String(e.data.category ?? ''),
            },
            informationArchitecture,
          ).includes(section.intent);
        }
        if ('tag' in section) {
          const tags = e.data.tags;
          return Array.isArray(tags) && tags.includes(section.tag);
        }
        return e.data[section.property] === section.value;
      });
      if (matched.length === 0) return null;
      const items = sortSidebarEntries(matched).map(e => ({ slug: e.slug }));
      return { label: section.label, collapsed: section.collapsed, items };
    })
    .filter(Boolean);
}
const sidebar = buildSidebarItems(vaultEntries);

// Client-side Mermaid rendering with palette-aware theming, rendered/code toggle,
// copy buttons, and fullscreen pan/zoom dialog.
//
// IMPORTANT — string escaping in this array:
//   Each element is a double-quoted JS string.  Backslash sequences follow
//   normal JS string rules: '\\n' (escaped backslash + n) produces the two
//   characters \n in the value, which the browser then interprets as a newline
//   escape inside a string literal in the injected script.
//
//   The critical line is join('\\n'): the array element contains join('\n'),
//   which the browser parses as joining with a newline character.
const mermaidScript = [
  "import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';",
  // Reads live CSS custom properties so every diagram follows the active palette.
  "function getMermaidTheme() {",
  "  var s = getComputedStyle(document.documentElement);",
  "  var get = function(v) { return s.getPropertyValue(v).trim(); };",
  "  return {",
  "    theme: 'base',",
  "    themeVariables: {",
  "      background:         get('--sl-color-black'),",
  "      primaryColor:       get('--sl-color-accent-low'),",
  "      primaryTextColor:   get('--sl-color-gray-1'),",
  "      primaryBorderColor: get('--sl-color-accent'),",
  "      lineColor:          get('--sl-color-accent'),",
  "      secondaryColor:     get('--sl-color-gray-5'),",
  "      tertiaryColor:      get('--sl-color-gray-6'),",
  "      fontFamily:         get('--sl-font') || 'system-ui, sans-serif',",
  "      fontSize:           '14px',",
  "    },",
  "  };",
  "}",
  // Singleton fullscreen dialog with pan and zoom.
  // Guards with isConnected so Astro view-transition body swaps don't leave a stale reference.
  "var _mmdDialog = null;",
  "function getDialog() {",
  "  if (_mmdDialog && _mmdDialog.dlg.isConnected) return _mmdDialog;",
  "  _mmdDialog = null;",
  "  var dlg = document.createElement('dialog');",
  "  dlg.className = 'mermaid-dialog';",
  "  dlg.setAttribute('aria-label', 'Diagrama em tela cheia');",
  "  var tb = document.createElement('div');",
  "  tb.className = 'mermaid-dialog-toolbar';",
  "  function mkBtn(label, ariaLabel) {",
  "    var b = document.createElement('button');",
  "    b.className = 'mermaid-btn'; b.textContent = label;",
  "    b.setAttribute('aria-label', ariaLabel); return b;",
  "  }",
  "  var btnIn    = mkBtn('+ Ampliar',  'Ampliar zoom');",
  "  var btnOut   = mkBtn('− Reduzir',  'Reduzir zoom');",
  "  var btnReset = mkBtn('↺ Ajustar',  'Ajustar ao tamanho da janela');",
  "  var btnClose = mkBtn('✕ Fechar',   'Fechar (Esc)');",
  "  btnClose.className += ' mermaid-dialog-close';",
  "  tb.appendChild(btnIn); tb.appendChild(btnOut); tb.appendChild(btnReset); tb.appendChild(btnClose);",
  "  var vp = document.createElement('div');",
  "  vp.className = 'mermaid-dialog-viewport';",
  "  vp.style.cursor = 'grab';",
  "  var canvas = document.createElement('div');",
  "  canvas.className = 'mermaid-dialog-canvas';",
  "  vp.appendChild(canvas);",
  "  dlg.appendChild(tb); dlg.appendChild(vp);",
  "  document.body.appendChild(dlg);",
  "  var scale = 1, dx = 0, dy = 0;",
  "  function applyT() { canvas.style.transform = 'translate('+dx+'px,'+dy+'px) scale('+scale+')'; }",
  "  function fit() {",
  "    var svgEl = canvas.querySelector('svg');",
  "    if (!svgEl) { scale = 1; dx = 0; dy = 0; applyT(); return; }",
  "    // MUST read natural size — getBoundingClientRect reflects the current CSS",
  "    // transform on the canvas ancestor and oscillates on repeated calls.",
  "    // Priority: explicit width/height attrs (set by expand handler) → viewBox.",
  "    var sw = parseFloat(svgEl.getAttribute('width')) || 0;",
  "    var sh = parseFloat(svgEl.getAttribute('height')) || 0;",
  "    if (!sw || !sh) {",
  "      var vb = (svgEl.getAttribute('viewBox') || '').trim().split(/[\\s,]+/);",
  "      sw = parseFloat(vb[2]) || 0; sh = parseFloat(vb[3]) || 0;",
  "    }",
  "    if (!sw || !sh) { scale = 1; dx = 0; dy = 0; applyT(); return; }",
  "    var vw = vp.clientWidth, vh = vp.clientHeight;",
  "    scale = Math.min((vw - 32) / sw, (vh - 32) / sh);",
  "    dx = (vw - sw * scale) / 2;",
  "    dy = (vh - sh * scale) / 2;",
  "    applyT();",
  "  }",
  "  btnReset.addEventListener('click', fit);",
  "  btnIn.addEventListener('click', function() { scale = Math.min(scale * 1.25, 10); applyT(); });",
  "  btnOut.addEventListener('click', function() { scale = Math.max(scale / 1.25, 0.1); applyT(); });",
  "  btnClose.addEventListener('click', function() { dlg.close(); });",
  "  dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.close(); });",
  "  var drag = false, sx = 0, sy = 0, sdx = 0, sdy = 0;",
  "  vp.addEventListener('mousedown', function(e) {",
  "    if (e.button !== 0) return;",
  "    drag = true; sx = e.clientX; sy = e.clientY; sdx = dx; sdy = dy;",
  "    vp.style.cursor = 'grabbing'; e.preventDefault();",
  "  });",
  "  document.addEventListener('mousemove', function(e) {",
  "    if (!drag) return;",
  "    dx = sdx + (e.clientX - sx); dy = sdy + (e.clientY - sy); applyT();",
  "  });",
  "  document.addEventListener('mouseup', function() {",
  "    if (!drag) return; drag = false; vp.style.cursor = 'grab';",
  "  });",
  "  vp.addEventListener('wheel', function(e) {",
  "    e.preventDefault();",
  "    var r = vp.getBoundingClientRect();",
  "    var cx = e.clientX - r.left, cy = e.clientY - r.top;",
  "    var f = e.deltaY < 0 ? 1.1 : 0.9;",
  "    var ns = Math.min(Math.max(scale * f, 0.1), 10);",
  "    dx = cx - (cx - dx) * (ns / scale);",
  "    dy = cy - (cy - dy) * (ns / scale);",
  "    scale = ns; applyT();",
  "  }, { passive: false });",
  "  _mmdDialog = { dlg: dlg, canvas: canvas, fit: fit, src: null };",
  "  return _mmdDialog;",
  "}",
  "var _mermaidBlocks = [];",
  "async function renderMermaid() {",
  "  _mermaidBlocks = [];",
  "  mermaid.initialize(Object.assign({ startOnLoad: false }, getMermaidTheme()));",
  "  for (const pre of document.querySelectorAll('pre[data-language=\"mermaid\"]')) {",
  "    const wrap = pre.closest('figure') ?? pre;",
  "    // Expressive Code wraps each source line in <div class=\"ec-line\">.",
  "    // pre.textContent concatenates lines without newlines, producing invalid",
  "    // Mermaid syntax.  Reconstruct by joining ec-line textContent with \\n.",
  "    const ecLines = pre.querySelectorAll('.ec-line');",
  "    const source = ecLines.length",
  "      ? Array.from(ecLines).map(function(l) { return l.textContent; }).join('\\n').trim()",
  "      : pre.textContent.trim();",
  "    // id outside try so catch can clean up the orphaned #d{id} Mermaid injects.",
  "    const id = 'mmd' + Math.random().toString(36).slice(2);",
  "    try {",
  "      const { svg } = await mermaid.render(id, source);",
  "      if (svg.includes('Syntax error') || svg.includes('error in text')) {",
  "        document.getElementById('d' + id)?.remove();",
  "        console.warn('[mermaid] syntax error in diagram — leaving code block intact');",
  "        continue;",
  "      }",
  "      // Block wrapper",
  "      const block = document.createElement('div');",
  "      block.className = 'mermaid-block';",
  "      // Toolbar",
  "      const toolbar = document.createElement('div');",
  "      toolbar.className = 'mermaid-toolbar';",
  "      const toggleBtn = document.createElement('button');",
  "      toggleBtn.className = 'mermaid-btn mermaid-toggle';",
  "      toggleBtn.textContent = 'Ver código';",
  "      const copyBtn = document.createElement('button');",
  "      copyBtn.className = 'mermaid-btn mermaid-copy';",
  "      copyBtn.textContent = 'Copiar PNG';",
  "      const expandBtn = document.createElement('button');",
  "      expandBtn.className = 'mermaid-btn mermaid-expand';",
  "      expandBtn.textContent = 'Expandir';",
  "      toolbar.appendChild(toggleBtn);",
  "      toolbar.appendChild(copyBtn);",
  "      toolbar.appendChild(expandBtn);",
  "      // Rendered view (default)",
  "      const renderedView = document.createElement('div');",
  "      renderedView.className = 'mermaid-view mermaid-rendered';",
  "      renderedView.innerHTML = svg;",
  "      // Mermaid injects style='max-width:Xpx' inline, which beats any CSS max-width.",
  "      // Remove it so the container (and CSS width:100%) controls sizing instead.",
  "      var inlineSvg = renderedView.querySelector('svg');",
  "      if (inlineSvg) inlineSvg.style.removeProperty('max-width');",
  "      // Code view — original EC figure cloned in, hidden by default",
  "      const codeView = document.createElement('div');",
  "      codeView.className = 'mermaid-view mermaid-code';",
  "      codeView.hidden = true;",
  "      codeView.appendChild(wrap.cloneNode(true));",
  "      // Toggle between rendered and code views",
  "      let mode = 'rendered';",
  "      toggleBtn.addEventListener('click', function() {",
  "        if (mode === 'rendered') {",
  "          block.style.minHeight = block.offsetHeight + 'px';",
  "          mode = 'code';",
  "          renderedView.hidden = true;",
  "          codeView.hidden = false;",
  "          toggleBtn.textContent = 'Ver diagrama';",
  "          copyBtn.textContent = 'Copiar fonte';",
  "        } else {",
  "          mode = 'rendered';",
  "          renderedView.hidden = false;",
  "          codeView.hidden = true;",
  "          toggleBtn.textContent = 'Ver código';",
  "          copyBtn.textContent = 'Copiar PNG';",
  "          block.style.minHeight = '';",
  "        }",
  "      });",
  "      // Copy: PNG image in rendered mode, Mermaid source text in code mode.",
  "      // SVG→Canvas→PNG uses XMLSerializer + blob URL so CSS vars resolve correctly.",
  "      copyBtn.addEventListener('click', function() {",
  "        var prev = copyBtn.textContent;",
  "        function flash() { copyBtn.textContent = 'Copiado!'; setTimeout(function() { copyBtn.textContent = prev; }, 2000); }",
  "        if (mode !== 'rendered') { navigator.clipboard.writeText(source).then(flash); return; }",
  "        var svgEl = renderedView.querySelector('svg');",
  "        if (!svgEl) return;",
  "        var bb = svgEl.getBoundingClientRect();",
  "        var w = Math.round(bb.width) || 800, h = Math.round(bb.height) || 600;",
  "        var clone = svgEl.cloneNode(true);",
  "        clone.setAttribute('width', w); clone.setAttribute('height', h);",
  "        var svgStr = new XMLSerializer().serializeToString(clone);",
  "        var url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));",
  "        var img = new Image();",
  "        img.onload = function() {",
  "          var cv = document.createElement('canvas');",
  "          cv.width = w * 2; cv.height = h * 2;",
  "          var ctx = cv.getContext('2d');",
  "          ctx.scale(2, 2); ctx.drawImage(img, 0, 0);",
  "          URL.revokeObjectURL(url);",
  "          cv.toBlob(function(blob) {",
  "            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(flash);",
  "          }, 'image/png');",
  "        };",
  "        img.src = url;",
  "      });",
  "      // Expand: open SVG in fullscreen dialog with pan/zoom.",
  "      // cloneNode preserves SVG namespace; innerHTML does not.",
  "      // Same diagram → restore previous pan/zoom (canvas.style.transform persists).",
  "      // Different diagram → load fresh SVG and fit to viewport.",
  "      expandBtn.addEventListener('click', function() {",
  "        var d = getDialog();",
  "        var isSame = (d.src === source);",
  "        d.src = source;",
  "        // Always refresh SVG so theme re-renders are reflected.",
  "        var origSvg = renderedView.querySelector('svg');",
  "        d.canvas.innerHTML = '';",
  "        if (origSvg) {",
  "          var clone = origSvg.cloneNode(true);",
  "          clone.style.removeProperty('max-width');",
  "          var vb = (clone.getAttribute('viewBox') || '').trim().split(/[\\s,]+/);",
  "          var nw = parseFloat(vb[2]), nh = parseFloat(vb[3]);",
  "          if (nw > 0 && nh > 0) { clone.setAttribute('width', nw); clone.setAttribute('height', nh); }",
  "          d.canvas.appendChild(clone);",
  "        }",
  "        d.dlg.showModal();",
  "        if (!isSame) setTimeout(d.fit, 50);",
  "      });",
  "      _mermaidBlocks.push({ source: source, renderedView: renderedView });",
  "      block.appendChild(toolbar);",
  "      block.appendChild(renderedView);",
  "      block.appendChild(codeView);",
  "      wrap.replaceWith(block);",
  "    } catch(e) {",
  "      document.getElementById('d' + id)?.remove();",
  "      console.warn('[mermaid]', e);",
  "    }",
  "  }",
  "}",
  "// By the time this module executes (after CDN import resolves),",
  "// DOMContentLoaded and astro:page-load have already fired.  Call directly.",
  "renderMermaid();",
  "document.addEventListener('astro:page-load', renderMermaid);",
  "// Re-render SVGs on dark/light toggle — only innerHTML, block DOM stays intact.",
  "new MutationObserver(async function() {",
  "  if (!_mermaidBlocks.length) return;",
  "  mermaid.initialize(Object.assign({ startOnLoad: false }, getMermaidTheme()));",
  "  for (var _e of _mermaidBlocks) {",
  "    var _id = 'mmd' + Math.random().toString(36).slice(2);",
  "    try {",
  "      var _r = await mermaid.render(_id, _e.source);",
  "      if (!_r.svg.includes('Syntax error') && !_r.svg.includes('error in text')) {",
  "        _e.renderedView.innerHTML = _r.svg;",
  "        var _s = _e.renderedView.querySelector('svg');",
  "        if (_s) _s.style.removeProperty('max-width');",
  "      }",
  "    } catch(_ex) { document.getElementById('d' + _id)?.remove(); }",
  "  }",
  "}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });",
].join('\n');

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
    generateVaultJson(),
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
        './.site/styles/theme-runtime.css',
      ],
      components: {
        Header: './.site/components/Header.astro',
        Footer: './.site/components/Footer.astro',
      },
    }),
  ],
});

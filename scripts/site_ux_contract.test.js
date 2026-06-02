const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('Astro header keeps theme controls discoverable without mobile duplication', () => {
  const header = read('.site/components/Header.astro');
  const mobileFooter = read('.site/components/MobileMenuFooter.astro');
  const astroConfig = read('astro.config.mjs');
  const customCss = read('.site/styles/custom.css');
  const footer = read('.site/components/Footer.astro');
  const pageFrame = read('.site/components/PageFrame.astro');
  const twoColumn = read('.site/components/TwoColumnContent.astro');

  assert.match(header, /details class="vault-theme-mobile print:hidden"/);
  assert.match(header, /<summary aria-label="Tema do site" title="Tema">◐<\/summary>/);
  assert.match(header, /aria-label="Tema do site no mobile"/);
  assert.match(header, /data-vault-palette-select/);
  assert.match(header, /data-vault-mode-select/);
  assert.match(header, /repoName === 'vault-seed'/);
  assert.match(header, /content: 'VS'/);
  assert.doesNotMatch(header, /data-vault-sidebar-toggle/);
  assert.doesNotMatch(header, /data-vault-focus-toggle/);
  assert.doesNotMatch(header, /vault-seed:focus-mode/);
  assert.match(pageFrame, /data-vault-sidebar-toggle="left"/);
  assert.match(twoColumn, /data-vault-sidebar-toggle="right"/);
  assert.match(pageFrame, /\.vault-sidebar-rail-toggle svg[\s\S]*width: 1em/);
  assert.match(twoColumn, /\.vault-sidebar-rail-toggle svg[\s\S]*width: 1em/);
  assert.match(pageFrame, /data-vault-sidebar-left='collapsed'[\s\S]*\.vault-sidebar-rail-toggle--left svg[\s\S]*scaleX\(-1\)/);
  assert.match(twoColumn, /data-vault-sidebar-right='collapsed'[\s\S]*\.vault-sidebar-rail-toggle--right svg[\s\S]*scaleX\(-1\)/);
  assert.match(pageFrame, /vault-seed:sidebar-left-collapsed/);
  assert.match(pageFrame, /vault-seed:sidebar-right-collapsed/);
  assert.match(customCss, /data-vault-sidebar-left='collapsed'[\s\S]*\.sidebar-pane/);
  assert.match(customCss, /data-vault-sidebar-right='collapsed'/);
  assert.match(customCss, /data-vault-sidebar-right='collapsed'[\s\S]*\.main-pane[\s\S]*--sl-content-margin-inline: auto/);
  assert.doesNotMatch(customCss, /data-vault-focus='content'/);
  assert.match(footer, /Feito com ♥ por/);
  assert.doesNotMatch(footer, /made with/);
  assert.match(header, /href={`\$\{base\}\/explorar\/`}>Explorar/);
  assert.match(header, /href={`\$\{base\}\/lab\/`}>Lab/);

  assert.match(astroConfig, /PageFrame: '\.\/\.site\/components\/PageFrame\.astro'/);
  assert.match(astroConfig, /TwoColumnContent: '\.\/\.site\/components\/TwoColumnContent\.astro'/);
  assert.match(astroConfig, /MobileMenuFooter: '\.\/\.site\/components\/MobileMenuFooter\.astro'/);
  assert.doesNotMatch(mobileFooter, /ThemeSelect/);
  assert.match(mobileFooter, /LanguageSelect/);
});

test('Graph previews show truncated labels while preserving full accessible titles', () => {
  const home = read('.site/pages/index.astro');
  const graph = read('.site/components/VaultGraphView.astro');
  const css = read('.site/styles/custom.css');

  for (const source of [home, graph]) {
    assert.match(source, /function truncateLabel/);
    assert.match(source, /value\.length > max/);
    assert.match(source, /<title>.*node\.title/s);
    assert.match(source, /aria-label=.*node\.title/s);
    assert.match(source, /vault-graph-view__label--short[\s\S]*truncateLabel\(node\.title\)/);
    assert.match(source, /data-vault-graph-node-label/);
  }

  assert.match(home, /heroNodeCap = Math\.max\(8, Math\.min\(28, Math\.ceil\(explore\.graph\.nodes\.length \* 0\.22\)\)\)/);
  assert.match(home, /rótulo completo ao passar o mouse ou focar/);
  // overflow:visible + clip-path avoids compositing issues inside fixed+overflow-y ancestors
  assert.match(css, /\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(css, /\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*hidden/);
  // clip-path clips the painted output without creating a scroll-container BFC
  assert.match(css, /\.vault-graph-view__canvas\s*\{[^}]*clip-path:\s*inset\(0 round 1rem\)/);
  assert.doesNotMatch(home, /node\.parentNode\?\.appendChild\(node\)/);
  assert.doesNotMatch(graph, /node\.parentNode\?\.appendChild\(node\)/);
  assert.match(home, /vault-graph-view__hover-layer/);
  assert.match(graph, /vault-graph-view__hover-layer/);
  assert.match(home, /classList\.add\('is-hovered'\)/);
  assert.match(graph, /classList\.add\('is-hovered'\)/);
  assert.doesNotMatch(home, /vault-graph-view__hitbox/);
  assert.doesNotMatch(graph, /vault-graph-view__hitbox/);
  assert.doesNotMatch(css, /vault-graph-view__hitbox/);
  assert.match(css, /\.vault-graph-view__nodes text[\s\S]*pointer-events: none/);
  assert.match(css, /\.vault-graph-view__hover-layer[\s\S]*opacity: 0;[\s\S]*pointer-events: none/);
  assert.match(css, /data-vault-graph-hover='1'[\s\S]*\.vault-graph-view__hover-layer[\s\S]*opacity: 1/);
});

test('Marimo shell spacing remains topbar-aware and smoke-tested', () => {
  const css = read('.site/styles/marimo-vault.css');
  const smoke = read('scripts/smoke_responsive.mjs');
  const shellTest = read('scripts/lab_shell_contract.test.mjs');
  const exportNotebooks = read('scripts/export_notebooks.mjs');

  assert.match(css, /--vault-lab-topbar-height: 3\.5rem/);
  assert.match(css, /--vault-lab-content-gap: 4\.75rem/);
  assert.match(css, /--vault-lab-content-offset: calc\(var\(--vault-lab-topbar-height\) \+ var\(--vault-lab-content-gap\)\)/);
  assert.match(css, /:root\[data-vault-marimo-shell="lab"\] #root/);
  assert.match(css, /#root \[data-testid="chrome-wrapper"\]/);
  assert.match(css, /\.vault-marimo-navigation \*/);
  assert.match(css, /\[class~="min-w-\[400px\]"\]/);
  assert.match(css, /\[class~="px-1"\][\s\S]*padding-inline: clamp\(0\.75rem/);
  assert.match(css, /\[class~="fixed"\]\[class~="top-0"\]\[class~="right-0"\]/);
  assert.match(css, /position: sticky/);
  assert.match(css, /padding-top: var\(--vault-lab-content-gap\) !important/);
  assert.match(css, /padding-top: calc\(var\(--vault-lab-content-gap\) \+ env\(safe-area-inset-top, 0px\)\) !important/);
  assert.match(css, /--vault-lab-content-gap: 5rem/);
  assert.match(css, /\.vault-lab-footer[\s\S]*bottom: 0/);
  assert.match(exportNotebooks, /vault-seed-slides-lite\.html[\s\S]*\$\{themeSelectorHtml\}/);
  assert.match(exportNotebooks, /\.vault-lite-slides \{ width: 100%; max-width: 100%;/);
  assert.match(exportNotebooks, /attachSelectorToTopbar/);
  assert.match(exportNotebooks, /topbar\.appendChild\(selector\)/);
  assert.match(exportNotebooks, /data-vault-lab-notebook-search/);
  assert.match(exportNotebooks, /data-vault-lab-notebook-link/);
  assert.match(exportNotebooks, /vault-lab-notebook-filter__input/);
  assert.match(exportNotebooks, /vault-lab-notebook-empty/);
  assert.match(exportNotebooks, /applyNotebookFilter/);
  assert.match(exportNotebooks, /data-vault-lab-notebook-title/);

  assert.match(smoke, /document\.querySelector\("#root"\)/);
  assert.match(smoke, /document\.querySelector\("\.vault-lab-topbar"\)/);
  assert.match(smoke, /data-testid="chrome-wrapper"/);
  assert.match(smoke, /paddingTop: Number\.parseFloat\(getComputedStyle\(notebookRoot\)\.paddingTop\)/);
  assert.match(smoke, /layout\.root\.contentTop < layout\.topbar\.bottom/);
  assert.match(smoke, /notebook content starts under the Lab topbar/);

  assert.match(shellTest, /assert\.doesNotMatch\(exportNotebooks, \/vault-marimo-fullscreen-toggle\//);
  assert.match(shellTest, /assert\.match\(exportNotebooks, \/vault-seed-slides-lite\\\.html\//);
});


test('Graph canvas is clipped, square, and sidebar graph is centered', () => {
  const css = read('.site/styles/custom.css');
  const graph = read('.site/components/VaultGraphView.astro');

  // overflow:visible + CSS clip-path avoids the compositing-barrier issue with fixed ancestors
  assert.match(css, /\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(css, /\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*hidden/);

  // SVG <clipPath> is defined in <defs> so nodes/links are clipped in user-space
  assert.match(graph, /<clipPath/);
  // Viewport group carries the clip-path attribute
  assert.match(graph, /clip-path.*url\(#/);

  // aspect-ratio 1/1 ensures the SVG stays square on all viewports
  assert.match(css, /\.vault-graph-view__canvas[\s\S]*aspect-ratio: 1 \/ 1/);

  // sidebar graph centers itself when narrower than its container
  assert.match(css, /\.vault-graph-sidebar[\s\S]*margin-inline: auto/);

  // post-drag settle runs global relaxation (null focus) so ALL visible nodes spread apart
  assert.match(graph, /runPhysicsRelaxation\(1, null\)/);
  assert.doesNotMatch(graph, /scheduleViewportSettle[\s\S]{0,200}runPhysicsRelaxation\(1, focusItem\)/);

  // settle steps increased so spreading has more runway
  assert.match(graph, /POST_DRAG_SETTLE_STEPS = 60/);
});

test('Graph toolbar buttons have consistent sizing and do not shrink', () => {
  const css = read('.site/styles/custom.css');

  // physical width/height fallbacks alongside logical inline-size/block-size (iOS Safari compat)
  assert.match(css, /\.vault-graph-view__button[\s\S]*width: 2rem/);
  assert.match(css, /\.vault-graph-view__button[\s\S]*height: 2rem/);
  assert.match(css, /\.vault-graph-view__button[\s\S]*flex-shrink: 0/);

  // icon is inline SVG — sized directly with width/height, no font-size hack needed
  assert.match(css, /\.vault-graph-view__button-icon[\s\S]*width: 1\.25rem/);
});

test('Footer kudos renders as compact pill consistent with marimo footer style', () => {
  const footer = read('.site/components/Footer.astro');
  const marimoVault = read('.site/styles/marimo-vault.css');

  // pill shape: inline-flex + border-radius + fit-content width
  assert.match(footer, /\.kudos[\s\S]*display: inline-flex/);
  assert.match(footer, /\.kudos[\s\S]*border-radius: 999px/);
  assert.match(footer, /\.kudos[\s\S]*width: fit-content/);

  // no width:100% which would stretch the pill to full viewport width on mobile
  assert.doesNotMatch(footer, /\.kudos[\s\S]*width: 100%/);

  // font-variant-emoji:text prevents ♥ from rendering as color emoji on iOS Safari
  assert.match(footer, /\.kudos[\s\S]*font-variant-emoji: text/);
  assert.match(marimoVault, /\.vault-lab-footer[\s\S]*font-variant-emoji: text/);

  // both footers use the same font-size so they feel consistent
  assert.match(footer, /\.kudos[\s\S]*font-size: 0\.8125rem/);
  assert.match(marimoVault, /\.vault-lab-footer[\s\S]*font-size: 0\.8125rem/);
});

test('Graph interactions expose expand/collapse/zoom/pan affordances', () => {
  const graph = read('.site/components/VaultGraphView.astro');
  const css = read('.site/styles/custom.css');

  assert.match(graph, /vault-graph-view__toolbar/);
  assert.match(graph, /data-vault-graph-action="expand"/);
  assert.match(graph, /data-vault-graph-action="collapse"/);
  assert.match(graph, /data-vault-graph-action="recenter"/);
  assert.match(graph, /pointerdown/);
  assert.match(graph, /pointermove/);
  assert.match(graph, /pointerup/);
  assert.match(graph, /wheel/);
  assert.match(graph, /startDrag\(/);
  assert.match(graph, /startPan\(/);
  assert.match(graph, /zoom\(/);
  assert.match(graph, /setVisibleCount\(/);
  assert.match(graph, /applyVisibility\(/);
  assert.match(graph, /data-vault-graph-caption/);
  assert.match(graph, /recenter\(\)/);
  assert.match(graph, /data-vault-graph-viewport/);
  assert.match(graph, /data-vault-graph-edge/);

  assert.match(css, /vault-graph-view__toolbar/);
  assert.match(css, /vault-graph-view__button/);
  assert.match(css, /vault-graph-view__canvas/);
  assert.match(css, /vault-graph-view__canvas\.is-panning/);
  assert.match(css, /vault-graph-view__viewport/);
  assert.match(css, /touch-action: none/);
  assert.match(css, /\.vault-graph-view__links line/);
  assert.match(css, /\.vault-graph-view__nodes a\[hidden\]/);
});

test('Graph has accessible legend and full node list as text alternative', () => {
  const graph = read('.site/components/VaultGraphView.astro');
  const css = read('.site/styles/custom.css');

  // SVG references the legend via aria-describedby (supplements the title label)
  assert.match(graph, /aria-describedby=\{graphLegendId\}/);

  // Legend paragraph carries the matching id
  assert.match(graph, /id=\{graphLegendId\}/);

  // Legend explains the visual encoding (size = connections)
  assert.match(graph, /Círculos maiores têm mais conexões/);

  // Accessible list is a <details> so it's collapsed by default but discoverable
  assert.match(graph, /<details class="vault-graph-view__accessible-list">/);
  assert.match(graph, /<summary>Lista de notas e legenda visual<\/summary>/);

  // Node list renders all sortedNodes (not just initially visible ones)
  assert.match(graph, /vault-graph-view__node-list/);
  assert.match(graph, /sortedNodes\.map/);

  // Each list item has a link + connection count
  assert.match(graph, /node\.degree.*conexão/s);

  // CSS for the accessible list exists
  assert.match(css, /\.vault-graph-view__accessible-list\s*\{/);
  assert.match(css, /\.vault-graph-view__node-list\s*\{/);
  // list items: link truncates, count stays full-width
  assert.match(css, /\.vault-graph-view__node-list a\s*\{[^}]*text-overflow:\s*ellipsis/);
  assert.match(css, /\.vault-graph-view__node-list li span\s*\{[^}]*flex:\s*none/);
});

test('Accessibility foundations: skip link, lang, and license link are present', () => {
  const pageFrame = read('.site/components/PageFrame.astro');
  const css = read('.site/styles/custom.css');
  const astroConfig = read('astro.config.mjs');

  // Skip link must point to the main content landmark (WCAG 2.1 AA 2.4.1)
  assert.match(pageFrame, /class="vault-skip-link"/);
  assert.match(pageFrame, /href="#vault-main-content"/);
  assert.match(pageFrame, /id="vault-main-content"/);

  // Skip link must be visually hidden by default and visible on focus
  assert.match(css, /\.vault-skip-link[\s\S]*transform: translateY/);
  assert.match(css, /\.vault-skip-link:focus[\s\S]*transform: translateY\(0\)/);

  // Machine-readable license declaration in every page head
  assert.match(astroConfig, /rel: 'license'/);
  assert.match(astroConfig, /href: '\/LICENSE\.md'/);
});

test('Package license fields align with LICENSE.md (GPL-3.0-only)', () => {
  const rootPkg = read('package.json');
  const cliPkg = read('packages/cli/package.json');
  const astroPkg = read('packages/astro-plugins/package.json');
  const noticeMd = read('NOTICE.md');

  assert.match(rootPkg, /"license": "GPL-3\.0-only"/);
  assert.match(cliPkg, /"license": "GPL-3\.0-only"/);
  assert.match(astroPkg, /"license": "GPL-3\.0-only"/);

  // NOTICE.md must explain both software and content license layers
  assert.match(noticeMd, /GPL-3\.0-only/);
  assert.match(noticeMd, /Creative Commons/);
  assert.match(noticeMd, /SPDX-License-Identifier/);
});

import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

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

  expect(header).toMatch(/details class="vault-theme-mobile print:hidden"/);
  expect(header).toMatch(/<summary aria-label="Tema do site" title="Tema">◐<\/summary>/);
  expect(header).toMatch(/aria-label="Tema do site no mobile"/);
  expect(header).toMatch(/data-vault-palette-select/);
  expect(header).toMatch(/data-vault-mode-select/);
  expect(header).toMatch(/repoName === 'vault-seed'/);
  expect(header).toMatch(/content: 'VS'/);
  expect(header).not.toMatch(/data-vault-sidebar-toggle/);
  expect(header).not.toMatch(/data-vault-focus-toggle/);
  expect(header).not.toMatch(/vault-seed:focus-mode/);
  expect(pageFrame).toMatch(/data-vault-sidebar-toggle="left"/);
  expect(twoColumn).toMatch(/data-vault-sidebar-toggle="right"/);
  expect(pageFrame).toMatch(/\.vault-sidebar-rail-toggle svg[\s\S]*width: 1em/);
  expect(twoColumn).toMatch(/\.vault-sidebar-rail-toggle svg[\s\S]*width: 1em/);
  expect(pageFrame).toMatch(/data-vault-sidebar-left='collapsed'[\s\S]*\.vault-sidebar-rail-toggle--left svg[\s\S]*scaleX\(-1\)/);
  expect(twoColumn).toMatch(/data-vault-sidebar-right='collapsed'[\s\S]*\.vault-sidebar-rail-toggle--right svg[\s\S]*scaleX\(-1\)/);
  expect(pageFrame).toMatch(/vault-seed:sidebar-left-collapsed/);
  expect(pageFrame).toMatch(/vault-seed:sidebar-right-collapsed/);
  expect(customCss).toMatch(/data-vault-sidebar-left='collapsed'[\s\S]*\.sidebar-pane/);
  expect(customCss).toMatch(/data-vault-sidebar-right='collapsed'/);
  expect(customCss).toMatch(/data-vault-sidebar-right='collapsed'[\s\S]*\.main-pane[\s\S]*--sl-content-margin-inline: auto/);
  expect(customCss).not.toMatch(/data-vault-focus='content'/);
  // "Feito com ♥" agora vem de vault.config.json (kudos), não está mais
  // hardcoded no template — Footer.astro só precisa renderizá-lo quando presente.
  const vaultConfig = JSON.parse(read('vault.config.json'));
  expect(footer, 'Footer deve renderizar o kudos configurável').toMatch(/\{vaultKudos\}/);
  expect(vaultConfig.kudos, 'vault-seed deve enviar o kudos pessoal por padrão (initialize.yml o remove para o usuário)').toMatch(/Feito com ♥/);
  // O author/holder do footer vira link configurável (license.holderUrl), para que
  // cada dono de vault aponte o rodapé ao próprio perfil em vez de herdar aretw0.
  expect(footer, 'Footer deve resolver o link configurável do holder/author').toMatch(/activeHolderUrl/);
  expect(footer, 'Footer deve renderizar o holder como link (.holder-link) quando há URL').toMatch(/holder-link/);
  expect(vaultConfig.license.holderUrl ?? '', 'vault-seed deve apontar o holder para o GitHub do mantenedor por padrão').toMatch(/^https:\/\/github\.com\/aretw0$/);
  expect(read('.github/workflows/initialize.yml'), 'initialize.yml deve derivar holder/holderUrl do owner do repositório para vaults gerados').toMatch(/cfg\.license\.holderUrl = 'https:\/\/github\.com\/' \+ owner/);
  expect(footer).not.toMatch(/made with/);
  expect(header).toMatch(/href={`\$\{base\}\/explorar\/`}>Explorar/);
  expect(header).toMatch(/href={`\$\{base\}\/lab\/`}>Lab/);

  expect(astroConfig).toMatch(/PageFrame: '\.\/\.site\/components\/PageFrame\.astro'/);
  expect(astroConfig).toMatch(/TwoColumnContent: '\.\/\.site\/components\/TwoColumnContent\.astro'/);
  expect(astroConfig).toMatch(/MobileMenuFooter: '\.\/\.site\/components\/MobileMenuFooter\.astro'/);
  expect(mobileFooter).not.toMatch(/ThemeSelect/);
  expect(mobileFooter).toMatch(/LanguageSelect/);
});

test('Graph previews show truncated labels while preserving full accessible titles', () => {
  const home = read('.site/pages/index.astro');
  const graph = read('.site/components/VaultGraphView.astro');
  const shared = read('.site/components/VaultGraphShared.astro');
  const css = read('.site/styles/custom.css');

  for (const source of [home, graph]) {
    expect(source).toMatch(/function truncateLabel/);
    expect(source).toMatch(/value\.length > max/);
    expect(source).toMatch(/<title>.*node\.title/s);
    expect(source).toMatch(/aria-label=.*node\.title/s);
    expect(source).toMatch(/vault-graph-view__label--short[\s\S]*truncateLabel\(node\.title\)/);
    expect(source).toMatch(/data-vault-graph-node-label/);
  }

  expect(home).toMatch(/<VaultGraphShared\s*\/?/);
  expect(graph).toMatch(/<VaultGraphShared\s*\/?/);
  expect(shared).toMatch(/__vaultGraphShared/);
  expect(shared).toMatch(/computeForces/);
  expect(shared).toMatch(/placeLabel/);
  expect(shared).toMatch(/estimateLabelHalfWidth/);

  expect(home).toMatch(/heroNodeCap = Math\.max\(8, Math\.min\(28, Math\.ceil\(explore\.graph\.nodes\.length \* 0\.22\)\)\)/);
  expect(home).toMatch(/nome completo/);
  // overflow:visible avoids compositing-barrier bugs inside fixed+overflow-y ancestors
  expect(css).toMatch(/\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*visible/);
  expect(css).not.toMatch(/\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*hidden/);
  // CSS clip-path creates a new stacking context that causes the same invisible-sidebar bug
  expect(css).not.toMatch(/\.vault-graph-view__canvas\s*\{[^}]*clip-path/);
  expect(home).not.toMatch(/node\.parentNode\?\.appendChild\(node\)/);
  expect(graph).not.toMatch(/node\.parentNode\?\.appendChild\(node\)/);
  expect(home).toMatch(/vault-graph-view__hover-layer/);
  expect(graph).toMatch(/vault-graph-view__hover-layer/);
  expect(home).toMatch(/classList\.add\('is-hovered'\)/);
  expect(graph).toMatch(/classList\.add\('is-hovered'\)/);
  expect(home).not.toMatch(/vault-graph-view__hitbox/);
  expect(graph).not.toMatch(/vault-graph-view__hitbox/);
  expect(css).not.toMatch(/vault-graph-view__hitbox/);
  expect(css).toMatch(/\.vault-graph-view__nodes text[\s\S]*pointer-events: none/);
  expect(css).toMatch(/\.vault-graph-view__hover-layer[\s\S]*opacity: 0;[\s\S]*pointer-events: none/);
  expect(css).toMatch(/data-vault-graph-hover='1'[\s\S]*\.vault-graph-view__hover-layer[\s\S]*opacity: 1/);
});

test('Marimo shell spacing remains topbar-aware and smoke-tested', () => {
  const css = read('.site/styles/marimo-vault.css');
  const smoke = read('scripts/smoke_responsive.mjs');
  const shellTest = read('scripts/lab_shell_contract.test.mjs');
  const exportNotebooks = read('scripts/export_notebooks.mjs');

  expect(css).toMatch(/--vault-lab-topbar-height: 3\.5rem/);
  expect(css).toMatch(/--vault-lab-content-gap: 4\.75rem/);
  expect(css).toMatch(/--vault-lab-content-offset: calc\(var\(--vault-lab-topbar-height\) \+ var\(--vault-lab-content-gap\)\)/);
  expect(css).toMatch(/:root\[data-vault-marimo-shell="lab"\] #root/);
  expect(css).toMatch(/#root \[data-testid="chrome-wrapper"\]/);
  expect(css).toMatch(/\.vault-marimo-navigation \*/);
  expect(css).toMatch(/\[class~="min-w-\[400px\]"\]/);
  expect(css).toMatch(/\[class~="px-1"\][\s\S]*padding-inline: clamp\(0\.75rem/);
  expect(css).toMatch(/\[class~="fixed"\]\[class~="top-0"\]\[class~="right-0"\]/);
  // The Lab shell pins its chrome and keeps a single scroll (the notebook's own
  // inner scroller). The topbar and kudos footer are fixed to the viewport — not
  // sticky/relative in body flow — and the body hides its outer scroll so the
  // page does not double-scroll. Regression guard for the drifting topbar/footer.
  expect(css).toMatch(/\.vault-lab-topbar \{[^}]*position: fixed/);
  expect(css).toMatch(/:root\[data-vault-marimo-shell="lab"\] body \{[^}]*overflow: hidden/);
  expect(css).toMatch(/:root\[data-vault-marimo-shell="lab"\] #root \{[^}]*height: 100dvh/);
  expect(css).toMatch(/padding-top: var\(--vault-lab-content-gap\) !important/);
  expect(css).toMatch(/padding-top: calc\(var\(--vault-lab-content-gap\) \+ env\(safe-area-inset-top, 0px\)\) !important/);
  expect(css).toMatch(/--vault-lab-content-gap: 5rem/);
  expect(css).toMatch(/\.vault-lab-footer \{[^}]*position: fixed/);
  expect(css).toMatch(/\.vault-lab-footer \{[^}]*inset-block-end: 1rem/);
  expect(css).toMatch(/\.vault-lab-footer \{[^}]*inset-inline-start: calc\(var\(--vault-lab-sidebar-width\) \+ 1rem\)/);
  expect(css).not.toMatch(/\.vault-lab-footer \{[^}]*position: relative/);
  expect(exportNotebooks).toMatch(/function injectNotebookFooter\(htmlPath\)/);
  expect(exportNotebooks).toMatch(/html\.replace\("<\/body>", `\$\{labKudosHtml\(\)\}\\n<\/body>`\)/);
  // Mobile presentations redirect to a vertical sibling (no reveal, native scroll)
  // instead of a hardcoded lite page; the vertical is a normal scrollable shell.
  expect(exportNotebooks).toMatch(/injectPresentationMobileFallback\(output, verticalOutputFor\(notebook\.output\)\)/);
  expect(exportNotebooks).toMatch(/function postprocessVerticalHtml/);
  expect(exportNotebooks).toMatch(/attachSelectorToTopbar/);
  expect(exportNotebooks).toMatch(/topbar\.appendChild\(selector\)/);
  expect(exportNotebooks).toMatch(/data-vault-lab-notebook-search/);
  expect(exportNotebooks).toMatch(/data-vault-lab-notebook-link/);
  expect(exportNotebooks).toMatch(/vault-lab-notebook-filter__input/);
  expect(exportNotebooks).toMatch(/vault-lab-notebook-empty/);
  expect(exportNotebooks).toMatch(/applyNotebookFilter/);
  expect(exportNotebooks).toMatch(/data-vault-lab-notebook-title/);

  expect(smoke).toMatch(/document\.querySelector\("#root"\)/);
  expect(smoke).toMatch(/document\.querySelector\("\.vault-lab-topbar"\)/);
  expect(smoke).toMatch(/data-testid="chrome-wrapper"/);
  expect(smoke).toMatch(/paddingTop: Number\.parseFloat\(getComputedStyle\(notebookRoot\)\.paddingTop\)/);
  expect(smoke).toMatch(/layout\.root\.contentTop < layout\.topbar\.bottom/);
  expect(smoke).toMatch(/notebook content starts under the Lab topbar/);

  expect(shellTest).toMatch(/expect\(exportNotebooks\)\.not\.toMatch\(\/vault-marimo-fullscreen-toggle\//);
  expect(shellTest).toMatch(/expect\(exportNotebooks\)\.not\.toMatch\(\/vault-seed-slides-lite\//);
  expect(shellTest).toMatch(/expect\(exportNotebooks\)\.toMatch\(\/verticalOutputFor\//);
});

test('Marimo presentation slides keep prose left-aligned while centering tables', () => {
  const css = read('.site/styles/marimo-vault.css');
  const proseFontBlock = css.match(
    /:root\[data-vault-marimo-presentation="slides"\] \.mo-slide-content \.markdown,[\s\S]*?font-size:[\s\S]*?\n\}/,
  )?.[0] ?? '';

  expect(css).toMatch(/\.mo-slide-content \{[\s\S]*text-align: left !important/);
  expect(css).toMatch(/\.mo-slide-content \{[\s\S]*margin: auto !important/);
  expect(css).toMatch(/\.mo-slide-content \{[\s\S]*overflow: auto !important/);
  expect(css).toMatch(/--vault-marimo-presentation-width: 86rem/);
  expect(css).toMatch(/--vault-marimo-slide-padding-inline: clamp\(2rem, 5vw, 4\.5rem\)/);
  expect(proseFontBlock).toMatch(/font-size: 1\.05rem/);
  expect(proseFontBlock).not.toMatch(/vw/);
  expect(css).not.toMatch(/font-size:\s*clamp\([^)]*vw/);
  expect(css).not.toMatch(/section:first-child \.mo-slide-content/);
  expect(css).toMatch(/\.mo-slide-content\[data-vault-marimo-slide-cover="true"\] \{[\s\S]*margin: auto !important;[\s\S]*text-align: center !important/);
  expect(css).toMatch(/\.mo-slide-content\[data-vault-marimo-slide-cover="true"\] \.output,[\s\S]*text-align: center !important/);
  expect(css).toMatch(/\.mo-slide-content h2 \{[\s\S]*font-size: 2\.15rem/);
  expect(css).toMatch(/\.mo-slide-content\[data-vault-marimo-slide-cover="true"\] h1 \{[\s\S]*font-size: 3\.6rem/);
  expect(css).toMatch(/\.mo-slide-content \.output,[\s\S]*margin-inline: 0 !important;[\s\S]*text-align: left !important/);
  expect(css).toMatch(/\.mo-slide-content \.output:has\(table\),[\s\S]*margin-inline: 0 !important/);
  expect(css).toMatch(/\.mo-slide-content marimo-table,[\s\S]*margin-inline: auto !important/);
  expect(read('scripts/export_notebooks.mjs')).toMatch(/dataset\.vaultMarimoSlideCover = "true"/);
});


test('Graph canvas is clipped, square, and sidebar graph is centered', () => {
  const css = read('.site/styles/custom.css');
  const graph = read('.site/components/VaultGraphView.astro');

  // SVG overflow:visible avoids the Chrome compositing-barrier that hides the sidebar graph
  // inside position:fixed+overflow-y:auto. Clipping is handled by the CSS wrapper div instead.
  expect(css).toMatch(/\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*visible/);
  expect(css).not.toMatch(/\.vault-graph-view__canvas\s*\{[^}]*overflow:\s*hidden/);
  // Wrapper div provides the clip — no separate SVG <clipPath> that would mismatch the visual border-radius
  expect(graph).not.toMatch(/clip-path.*url\(#/);
  expect(css).toMatch(/\.vault-graph-view__canvas-clip[\s\S]*overflow:\s*hidden/);

  // aspect-ratio 1/1 ensures the SVG stays square on all viewports
  expect(css).toMatch(/\.vault-graph-view__canvas[\s\S]*aspect-ratio: 1 \/ 1/);

  // sidebar graph centers itself when narrower than its container
  expect(css).toMatch(/\.vault-graph-sidebar[\s\S]*margin-inline: auto/);

  // post-drag settle runs global relaxation (null focus) so ALL visible nodes spread apart
  expect(graph).toMatch(/runPhysicsRelaxation\(1, null\)/);
  expect(graph).not.toMatch(/scheduleViewportSettle[\s\S]{0,200}runPhysicsRelaxation\(1, focusItem\)/);

  // settle steps increased so spreading has more runway
  expect(graph).toMatch(/POST_DRAG_SETTLE_STEPS = 60/);
});

test('Graph toolbar buttons have consistent sizing and do not shrink', () => {
  const css = read('.site/styles/custom.css');

  // physical width/height fallbacks alongside logical inline-size/block-size (iOS Safari compat)
  expect(css).toMatch(/\.vault-graph-view__button[\s\S]*width: 2rem/);
  expect(css).toMatch(/\.vault-graph-view__button[\s\S]*height: 2rem/);
  expect(css).toMatch(/\.vault-graph-view__button[\s\S]*flex-shrink: 0/);

  // icon is inline SVG — sized directly with width/height, no font-size hack needed
  expect(css).toMatch(/\.vault-graph-view__button-icon[\s\S]*width: 1\.25rem/);
});

test('Footer kudos renders as compact pill consistent with marimo footer style', () => {
  const footer = read('.site/components/Footer.astro');
  const marimoVault = read('.site/styles/marimo-vault.css');
  const exportNotebooks = read('scripts/export_notebooks.mjs');

  // pill shape: inline-flex + border-radius + fit-content width
  expect(footer).toMatch(/\.kudos[\s\S]*display: inline-flex/);
  expect(footer).toMatch(/\.kudos[\s\S]*border-radius: 999px/);
  expect(footer).toMatch(/\.kudos[\s\S]*width: fit-content/);

  // no width:100% which would stretch the pill to full viewport width on mobile
  expect(footer).not.toMatch(/\.kudos[\s\S]*width: 100%/);

  // font-variant-emoji:text prevents ♥ from rendering as color emoji on iOS Safari
  expect(footer).toMatch(/\.kudos[\s\S]*font-variant-emoji: text/);
  expect(marimoVault).toMatch(/\.vault-lab-footer[\s\S]*font-variant-emoji: text/);

  // both footers use the same font-size so they feel consistent
  expect(footer).toMatch(/\.kudos[\s\S]*font-size: 0\.8125rem/);
  expect(marimoVault).toMatch(/\.vault-lab-footer[\s\S]*font-size: 0\.8125rem/);
  expect(exportNotebooks).toMatch(/import \{ vaultKudos \} from "\.\.\/\.site\/lib\/vault-config\.mjs"/);
  expect(exportNotebooks).toMatch(/function labKudosHtml\(\)/);
  expect(exportNotebooks).not.toMatch(/por <a href="https:\/\/github\.com\/aretw0">aretw0<\/a>/);
});

test('Graph interactions expose expand/collapse/zoom/pan affordances', () => {
  const graph = read('.site/components/VaultGraphView.astro');
  const css = read('.site/styles/custom.css');

  expect(graph).toMatch(/vault-graph-view__toolbar/);
  expect(graph).toMatch(/data-vault-graph-action="expand"/);
  expect(graph).toMatch(/data-vault-graph-action="collapse"/);
  expect(graph).toMatch(/data-vault-graph-action="recenter"/);
  expect(graph).toMatch(/pointerdown/);
  expect(graph).toMatch(/pointermove/);
  expect(graph).toMatch(/pointerup/);
  expect(graph).toMatch(/wheel/);
  expect(graph).toMatch(/startDrag\(/);
  expect(graph).toMatch(/startPan\(/);
  expect(graph).toMatch(/zoom\(/);
  expect(graph).toMatch(/setVisibleCount\(/);
  expect(graph).toMatch(/applyVisibility\(/);
  expect(graph).toMatch(/data-vault-graph-caption/);
  expect(graph).toMatch(/recenter\(\)/);
  expect(graph).toMatch(/data-vault-graph-viewport/);
  expect(graph).toMatch(/data-vault-graph-edge/);

  expect(css).toMatch(/vault-graph-view__toolbar/);
  expect(css).toMatch(/vault-graph-view__button/);
  expect(css).toMatch(/vault-graph-view__canvas/);
  expect(css).toMatch(/vault-graph-view__canvas\.is-panning/);
  expect(css).toMatch(/vault-graph-view__viewport/);
  expect(css).toMatch(/touch-action: none/);
  expect(css).toMatch(/\.vault-graph-view__links line/);
  expect(css).toMatch(/\.vault-graph-view__nodes a\[hidden\]/);
});

test('Graph has accessible legend and full node list as text alternative', () => {
  const graph = read('.site/components/VaultGraphView.astro');
  const css = read('.site/styles/custom.css');

  // SVG references the legend via aria-describedby (supplements the title label)
  expect(graph).toMatch(/aria-describedby=\{graphLegendId\}/);

  // Legend paragraph carries the matching id
  expect(graph).toMatch(/id=\{graphLegendId\}/);

  // Legend explains the visual encoding (size = connections)
  expect(graph).toMatch(/Círculos maiores têm mais conexões/);

  // Accessible list is a <details> so it's collapsed by default but discoverable
  expect(graph).toMatch(/<details class="vault-graph-view__accessible-list">/);
  expect(graph).toMatch(/<summary>Lista de notas e legenda visual<\/summary>/);

  // Node list renders all sortedNodes (not just initially visible ones)
  expect(graph).toMatch(/vault-graph-view__node-list/);
  expect(graph).toMatch(/sortedNodes\.map/);

  // Each list item has a link + connection count
  expect(graph).toMatch(/node\.degree.*conexão/s);

  // CSS for the accessible list exists
  expect(css).toMatch(/\.vault-graph-view__accessible-list\s*\{/);
  expect(css).toMatch(/\.vault-graph-view__node-list\s*\{/);
  // list items: link truncates, count stays full-width
  expect(css).toMatch(/\.vault-graph-view__node-list a\s*\{[^}]*text-overflow:\s*ellipsis/);
  expect(css).toMatch(/\.vault-graph-view__node-list li span\s*\{[^}]*flex:\s*none/);
});

test('Accessibility foundations: skip link, lang, and license link are present', () => {
  const pageFrame = read('.site/components/PageFrame.astro');
  const css = read('.site/styles/custom.css');
  const astroConfig = read('astro.config.mjs');

  // Skip link must point to the main content landmark (WCAG 2.1 AA 2.4.1)
  expect(pageFrame).toMatch(/class="vault-skip-link"/);
  expect(pageFrame).toMatch(/href="#vault-main-content"/);
  expect(pageFrame).toMatch(/id="vault-main-content"/);

  // Skip link must be visually hidden by default and visible on focus
  expect(css).toMatch(/\.vault-skip-link[\s\S]*transform: translateY/);
  expect(css).toMatch(/\.vault-skip-link:focus[\s\S]*transform: translateY\(0\)/);

  // Machine-readable license declaration in every page head
  expect(astroConfig).toMatch(/rel: 'license'/);
  expect(astroConfig).toMatch(/href: '\/LICENSE\.md'/);
});

test('Homepage post list and capabilities render without interactive gating', () => {
  const home = read('.site/pages/index.astro');
  const css = read('.site/styles/custom.css');

  // Content must never be gated behind a <details> expand pattern.
  expect(home).not.toMatch(/class="vault-card__details"/);
  expect(home).not.toMatch(/vault-card__body-full/);
  expect(home).not.toMatch(/<summary[^>]*vault-card__body/);

  // Homepage uses the monospace post-list layout (cassidoo-style).
  expect(home).toMatch(/vault-home-mono/);
  expect(home).toMatch(/vault-post-list/);
  expect(home).toMatch(/vault-post-item/);

  // Capabilities section replaces the old card grid — must have at least 6 bullet items.
  const capItems = home.match(/<li>/g);
  expect(capItems && capItems.length >= 6, 'Expected at least 6 capability list items in the homepage').toBeTruthy();

  // Capabilities section must be present.
  expect(home).toMatch(/vault-capabilities/);

  // CSS defines the post-list and capabilities classes used by the homepage.
  expect(css).toMatch(/vault-post-list/);
  expect(css).toMatch(/vault-capabilities/);
  expect(css).toMatch(/vault-home-mono/);
});

test('Package license fields align with LICENSE.md (GPL-3.0-only)', () => {
  const rootPkg = read('package.json');
  const cliPkg = read('packages/cli/package.json');
  const astroPkg = read('packages/astro-plugins/package.json');
  const noticeMd = read('NOTICE.md');

  expect(rootPkg).toMatch(/"license": "GPL-3\.0-only"/);
  expect(cliPkg).toMatch(/"license": "GPL-3\.0-only"/);
  expect(astroPkg).toMatch(/"license": "GPL-3\.0-only"/);

  // NOTICE.md must explain both software and content license layers
  expect(noticeMd).toMatch(/GPL-3\.0-only/);
  expect(noticeMd).toMatch(/Creative Commons/);
  expect(noticeMd).toMatch(/SPDX-License-Identifier/);
});

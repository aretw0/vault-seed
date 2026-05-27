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
  assert.match(pageFrame, /\.vault-sidebar-rail-toggle span[\s\S]*place-items: center/);
  assert.match(twoColumn, /\.vault-sidebar-rail-toggle span[\s\S]*place-items: center/);
  assert.match(pageFrame, /vault-seed:sidebar-left-collapsed/);
  assert.match(pageFrame, /vault-seed:sidebar-right-collapsed/);
  assert.match(customCss, /data-vault-sidebar-left='collapsed'[\s\S]*\.sidebar-pane/);
  assert.match(customCss, /data-vault-sidebar-right='collapsed'/);
  assert.match(customCss, /data-vault-sidebar-right='collapsed'[\s\S]*\.main-pane[\s\S]*--sl-content-margin-inline: auto/);
  assert.doesNotMatch(customCss, /data-vault-focus='content'/);
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

  assert.match(home, /heroNodes = explore\.graph\.insights\.hubs\.slice\(0, 6\)/);
  assert.match(home, /rótulo completo ao passar o mouse ou focar/);
  assert.match(css, /overflow: visible/);
  assert.match(home, /node\.parentNode\?\.appendChild\(node\)/);
  assert.match(graph, /node\.parentNode\?\.appendChild\(node\)/);
  assert.match(home, /vault-graph-view__hitbox/);
  assert.match(graph, /vault-graph-view__hitbox/);
  assert.match(css, /\.vault-graph-view__hitbox[\s\S]*pointer-events: all/);
  assert.match(css, /\.vault-graph-view__nodes text[\s\S]*pointer-events: none/);
  assert.match(css, /\.vault-graph-view__label--full[\s\S]*opacity: 0;[\s\S]*visibility: hidden/);
  assert.match(css, /\.vault-graph-view__nodes a:is\(:hover, :focus-visible\) \.vault-graph-view__label--full[\s\S]*opacity: 1;[\s\S]*visibility: visible/);
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
  assert.match(css, /\[class~="min-w-\[400px\]"\]/);
  assert.match(css, /\[class~="fixed"\]\[class~="top-0"\]\[class~="right-0"\]/);
  assert.match(css, /position: sticky/);
  assert.match(css, /padding-top: var\(--vault-lab-content-gap\) !important/);
  assert.match(css, /padding-top: calc\(var\(--vault-lab-content-gap\) \+ env\(safe-area-inset-top, 0px\)\) !important/);
  assert.match(css, /--vault-lab-content-gap: 5rem/);
  assert.match(css, /\.vault-lab-footer/);
  assert.match(exportNotebooks, /attachSelectorToTopbar/);
  assert.match(exportNotebooks, /topbar\.appendChild\(selector\)/);

  assert.match(smoke, /document\.querySelector\("#root"\)/);
  assert.match(smoke, /document\.querySelector\("\.vault-lab-topbar"\)/);
  assert.match(smoke, /data-testid="chrome-wrapper"/);
  assert.match(smoke, /paddingTop: Number\.parseFloat\(getComputedStyle\(notebookRoot\)\.paddingTop\)/);
  assert.match(smoke, /layout\.root\.contentTop < layout\.topbar\.bottom/);
  assert.match(smoke, /notebook content starts under the Lab topbar/);

  assert.match(shellTest, /assert\.doesNotMatch\(exportNotebooks, \/vault-marimo-fullscreen-toggle\//);
  assert.match(shellTest, /assert\.match\(exportNotebooks, \/vault-seed-slides-lite\\\.html\//);
});

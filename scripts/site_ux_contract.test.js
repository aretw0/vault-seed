const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('Astro header keeps theme controls discoverable on mobile and desktop', () => {
  const header = read('.site/components/Header.astro');

  assert.match(header, /details class="vault-theme-mobile print:hidden"/);
  assert.match(header, /<summary aria-label="Tema do site" title="Tema">◐<\/summary>/);
  assert.match(header, /aria-label="Tema do site no mobile"/);
  assert.match(header, /data-vault-palette-select/);
  assert.match(header, /data-vault-mode-select/);
  assert.match(header, /repoName === 'vault-seed'/);
  assert.match(header, /href={`\$\{base\}\/explorar\/`}>Explorar/);
  assert.match(header, /href={`\$\{base\}\/lab\/`}>Lab/);
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
    assert.match(source, /<text[\s\S]*truncateLabel\(node\.title\)/);
  }

  assert.match(home, /heroNodes = explore\.graph\.insights\.hubs\.slice\(0, 6\)/);
  assert.match(home, /rótulos abreviados com título completo no foco/);
  assert.match(css, /\.vault-graph-view__nodes a:hover circle,\n\.vault-graph-view__nodes a:focus-visible circle/);
  assert.match(css, /\.vault-graph-view__nodes text/);
});

test('Marimo shell spacing remains topbar-aware and smoke-tested', () => {
  const css = read('.site/styles/marimo-vault.css');
  const smoke = read('scripts/smoke_responsive.mjs');
  const shellTest = read('scripts/lab_shell_contract.test.mjs');

  assert.match(css, /--vault-lab-topbar-height: 3\.25rem/);
  assert.match(css, /--vault-lab-content-offset: calc\(var\(--vault-lab-topbar-height\) \+ var\(--vault-lab-content-gap\)\)/);
  assert.match(css, /:root\[data-vault-marimo-shell="lab"\] #root/);
  assert.match(css, /padding-top: var\(--vault-lab-content-offset\) !important/);
  assert.match(css, /padding-top: calc\(var\(--vault-lab-topbar-height\) \+ 3\.25rem\) !important/);

  assert.match(smoke, /document\.querySelector\("#root"\)/);
  assert.match(smoke, /document\.querySelector\("\.vault-lab-topbar"\)/);
  assert.match(smoke, /paddingTop: Number\.parseFloat\(getComputedStyle\(notebookRoot\)\.paddingTop\)/);
  assert.match(smoke, /layout\.root\.top \+ layout\.root\.paddingTop < layout\.topbar\.bottom/);
  assert.match(smoke, /notebook content starts under the fixed Lab topbar/);

  assert.match(shellTest, /assert\.doesNotMatch\(exportNotebooks, \/vault-marimo-fullscreen-toggle\//);
  assert.match(shellTest, /assert\.match\(exportNotebooks, \/vault-seed-slides-lite\\\.html\//);
});

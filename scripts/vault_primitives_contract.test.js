const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('vault-section-header CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // flex layout with space-between so title and action area sit on opposite ends
  assert.match(css, /\.vault-section-header\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.vault-section-header\s*\{[^}]*justify-content:\s*space-between/);

  // h2 margin reset so the heading doesn't push the header out of alignment
  assert.match(css, /\.vault-section-header h2\s*\{[^}]*margin:/);
});

test('vault-metric CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // grid layout with fixed min-height so cards don't collapse on sparse data
  assert.match(css, /\.vault-metric\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.vault-metric\s*\{[^}]*min-height:\s*7\.5rem/);
  assert.match(css, /\.vault-metric\s*\{[^}]*border-radius:\s*0\.85rem/);

  // value: large bold number — regression here is visually obvious but easy to miss in review
  assert.match(css, /\.vault-metric__value\s*\{[^}]*font-weight:\s*800/);
  assert.match(css, /\.vault-metric__value\s*\{[^}]*font-size:\s*clamp/);

  // metric grid: responsive columns
  assert.match(css, /\.vault-metric-grid\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.vault-metric-grid\s*\{[^}]*auto-fit/);
});

test('vault-filter-panel CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // sticky positioning on desktop so filters stay in view during long note lists
  assert.match(css, /\.vault-filter-panel\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /\.vault-filter-panel\s*\{[^}]*top:/);

  // chip ARIA-to-style coupling: aria-pressed='true' must visually change the button
  assert.match(css, /\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*border-color/);
  assert.match(css, /\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*background/);
  assert.match(css, /\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*color/);
});

test('vault-resource-card CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // [hidden] must set display:none — this is what makes JS filter toggle work visually
  assert.match(css, /\.vault-resource-card\[hidden\]\s*\{[^}]*display:\s*none/);

  // h3 link: clamp to 2 lines — prevents cards from growing to different heights
  assert.match(css, /\.vault-resource-card h3 a\s*\{[^}]*-webkit-line-clamp:\s*2/);
  assert.match(css, /\.vault-resource-card h3 a\s*\{[^}]*overflow:\s*hidden/);

  // body text: clamp to 3 lines
  assert.match(css, /\.vault-resource-card p\s*\{[^}]*-webkit-line-clamp:\s*3/);
});

test('vault-empty-state CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // dashed border is the semantic signal for "placeholder / no content" — not a solid border
  assert.match(css, /\.vault-empty-state\s*\{[^}]*border:\s*1px dashed/);
  assert.match(css, /\.vault-empty-state\s*\{[^}]*border-radius:/);
});

test('vault-compact-list and vault-timeline CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // both share grid layout (no flex — consistent gap even when items wrap)
  assert.match(css, /\.vault-compact-list,\s*\n?\.vault-timeline\s*\{[^}]*display:\s*grid/);

  // list items: border-block-end as a separator (not margin or padding alone)
  assert.match(css, /\.vault-compact-list li,\s*\n?\.vault-timeline li\s*\{[^}]*border-block-end/);
  assert.match(css, /\.vault-compact-list li,\s*\n?\.vault-timeline li\s*\{[^}]*justify-content:\s*space-between/);

  // time/span: flex:none so it never shrinks when title is long
  assert.match(css, /\.vault-compact-list span,\s*\n?\.vault-timeline time\s*\{[^}]*flex:\s*none/);
});

test('explorar page uses vault primitive markup contracts', () => {
  const page = read('.site/pages/explorar/index.astro');

  // metric grid must have accessible label
  assert.match(page, /vault-metric-grid[\s\S]{0,50}aria-label/);

  // filter panel must have accessible label
  assert.match(page, /vault-filter-panel[\s\S]{0,50}aria-label/);

  // chips must be buttons with type="button" (not submit) and data attribute
  assert.match(page, /class="vault-chip" type="button"/);
  assert.match(page, /data-vault-explore-tag/);

  // resource list must have the data attribute used by JS filter engine
  assert.match(page, /vault-resource-list[\s\S]{0,50}data-vault-explore-results/);

  // empty state must start hidden and carry its activation attribute
  assert.match(page, /vault-empty-state[\s\S]{0,60}data-vault-explore-empty[\s\S]{0,30}hidden/);

  // filter JS must toggle card.hidden (display:none coupling)
  assert.match(page, /card\.hidden = /);

  // filter JS must toggle aria-pressed on chips (ARIA state coupling)
  assert.match(page, /toggleAttribute\('aria-pressed'/);
});

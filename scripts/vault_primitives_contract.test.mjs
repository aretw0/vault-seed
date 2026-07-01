import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, 'utf8');
}

test('vault-section-header CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // flex layout with space-between so title and action area sit on opposite ends
  expect(css).toMatch(/\.vault-section-header\s*\{[^}]*display:\s*flex/);
  expect(css).toMatch(/\.vault-section-header\s*\{[^}]*justify-content:\s*space-between/);

  // h2 margin reset so the heading doesn't push the header out of alignment
  expect(css).toMatch(/\.vault-section-header h2\s*\{[^}]*margin:/);
});

test('vault-metric CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // grid layout with fixed min-height so cards don't collapse on sparse data
  expect(css).toMatch(/\.vault-metric\s*\{[^}]*display:\s*grid/);
  expect(css).toMatch(/\.vault-metric\s*\{[^}]*min-height:\s*7\.5rem/);
  expect(css).toMatch(/\.vault-metric\s*\{[^}]*border-radius:\s*0\.85rem/);

  // value: large bold number — regression here is visually obvious but easy to miss in review
  expect(css).toMatch(/\.vault-metric__value\s*\{[^}]*font-weight:\s*800/);
  expect(css).toMatch(/\.vault-metric__value\s*\{[^}]*font-size:\s*clamp/);

  // metric grid: responsive columns
  expect(css).toMatch(/\.vault-metric-grid\s*\{[^}]*display:\s*grid/);
  expect(css).toMatch(/\.vault-metric-grid\s*\{[^}]*auto-fit/);
});

test('vault-filter-panel CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // sticky positioning on desktop so filters stay in view during long note lists
  expect(css).toMatch(/\.vault-filter-panel\s*\{[^}]*position:\s*sticky/);
  expect(css).toMatch(/\.vault-filter-panel\s*\{[^}]*top:/);

  // chip ARIA-to-style coupling: aria-pressed='true' must visually change the button
  expect(css).toMatch(/\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*border-color/);
  expect(css).toMatch(/\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*background/);
  expect(css).toMatch(/\.vault-chip\[aria-pressed='true'\][^{]*\{[^}]*color/);
});

test('vault-resource-card CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // [hidden] must set display:none — this is what makes JS filter toggle work visually
  expect(css).toMatch(/\.vault-resource-card\[hidden\]\s*\{[^}]*display:\s*none/);

  // h3 link: clamp to 2 lines — prevents cards from growing to different heights
  expect(css).toMatch(/\.vault-resource-card h3 a\s*\{[^}]*-webkit-line-clamp:\s*2/);
  expect(css).toMatch(/\.vault-resource-card h3 a\s*\{[^}]*overflow:\s*hidden/);

  // body text: clamp to 3 lines
  expect(css).toMatch(/\.vault-resource-card p\s*\{[^}]*-webkit-line-clamp:\s*3/);
});

test('vault-empty-state CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // dashed border is the semantic signal for "placeholder / no content" — not a solid border
  expect(css).toMatch(/\.vault-empty-state\s*\{[^}]*border:\s*1px dashed/);
  expect(css).toMatch(/\.vault-empty-state\s*\{[^}]*border-radius:/);
});

test('vault-compact-list and vault-timeline CSS contract', () => {
  const css = read('.site/styles/custom.css');

  // both share grid layout (no flex — consistent gap even when items wrap)
  expect(css).toMatch(/\.vault-compact-list,\s*\n?\.vault-timeline\s*\{[^}]*display:\s*grid/);

  // list items: border-block-end as a separator (not margin or padding alone)
  expect(css).toMatch(/\.vault-compact-list li,\s*\n?\.vault-timeline li\s*\{[^}]*border-block-end/);
  expect(css).toMatch(/\.vault-compact-list li,\s*\n?\.vault-timeline li\s*\{[^}]*justify-content:\s*space-between/);

  // time/span: flex:none so it never shrinks when title is long
  expect(css).toMatch(/\.vault-compact-list span,\s*\n?\.vault-timeline time\s*\{[^}]*flex:\s*none/);
});

test('explorar page uses vault primitive markup contracts', () => {
  const page = read('.site/pages/explorar/index.astro');

  // metric grid must have accessible label
  expect(page).toMatch(/vault-metric-grid[\s\S]{0,50}aria-label/);

  // filter panel must have accessible label
  expect(page).toMatch(/vault-filter-panel[\s\S]{0,50}aria-label/);

  // chips must be buttons with type="button" (not submit) and data attribute
  expect(page).toMatch(/class="vault-chip" type="button"/);
  expect(page).toMatch(/data-vault-explore-tag/);

  // resource list must have the data attribute used by JS filter engine
  expect(page).toMatch(/vault-resource-list[\s\S]{0,50}data-vault-explore-results/);

  // empty state must start hidden and carry its activation attribute
  expect(page).toMatch(/vault-empty-state[\s\S]{0,60}data-vault-explore-empty[\s\S]{0,30}hidden/);

  // filter JS must toggle card.hidden (display:none coupling)
  expect(page).toMatch(/card\.hidden = /);

  // filter JS must toggle aria-pressed on chips (ARIA state coupling)
  expect(page).toMatch(/toggleAttribute\('aria-pressed'/);
});

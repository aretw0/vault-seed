import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Astro and Marimo share theme storage keys", () => {
  const header = read(".site/components/Header.astro");
  const exportNotebooks = read("scripts/export_notebooks.mjs");

  for (const key of ["vault-seed:palette", "vault-seed:mode"]) {
    assert.match(header, new RegExp(key));
    assert.match(exportNotebooks, new RegExp(key));
  }

  assert.match(exportNotebooks, /legacyThemeStorageKey = "vault-seed:marimo-theme"/);
  assert.match(exportNotebooks, /legacyPaletteStorageKey = "vault-seed:marimo-palette"/);
});

test("published Lab pages keep the vault shell contract", () => {
  const exportNotebooks = read("scripts/export_notebooks.mjs");
  const labIndex = read(".site/pages/lab/index.astro");
  const marimoCss = read(".site/styles/marimo-vault.css");

  assert.match(exportNotebooks, /data-vault-marimo-navigation/);
  assert.match(exportNotebooks, /vault-lab-topbar/);
  assert.match(exportNotebooks, /vault-lab-sidebar/);
  assert.match(exportNotebooks, /vault-seed:lab-sidebar-collapsed/);
  assert.match(exportNotebooks, /data-vault-marimo-theme-selector/);

  assert.match(labIndex, /vault-card-grid/);
  assert.match(labIndex, /vault-card/);
  assert.match(labIndex, /vault-button/);
  assert.match(labIndex, /vault-status/);

  for (const palette of ["oceano", "terracota"]) {
    assert.match(marimoCss, new RegExp(`data-vault-marimo-palette="${palette}"`));
  }
});

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

test("Lab slide documentation matches the native Marimo layout contract", () => {
  const slideNotebook = read("99 - Meta e Anexos/Notebooks/apresentacoes/visao-geral.py");
  const labGuide = read("99 - Meta e Anexos/99.2 - Workflows/Usando o Lab (Notebooks Marimo).md");

  assert.match(slideNotebook, /layout_file="layouts\/visao-geral\.slides\.json"/);
  assert.match(labGuide, /layout_file/);
  assert.match(labGuide, /apresentacoes\/layouts\/.*\.slides\.json/);
  assert.doesNotMatch(labGuide, /mo\.carousel/);
  assert.doesNotMatch(labGuide, /Slides não entram automaticamente/);
});

test("Lab ETL demo uses shared local/published runtime primitives", () => {
  const runtime = read("99 - Meta e Anexos/Notebooks/_lab_notebook_runtime.py");
  const etlDemo = read("99 - Meta e Anexos/Notebooks/etl-demo.py");

  assert.match(runtime, /def read_lab_dataset/);
  assert.match(runtime, /def write_local_json_snapshot/);
  assert.match(runtime, /def write_local_dataframe_snapshot/);
  assert.match(runtime, /def write_local_markdown_note/);
  assert.match(runtime, /lab_generated/);
  assert.match(runtime, /def get_local_secret/);
  assert.match(runtime, /def fetch_local_url_text/);
  assert.match(runtime, /async def scrape_local_page_text/);
  assert.match(runtime, /def extract_local_image_text/);
  assert.match(runtime, /def local_vault_path/);
  assert.match(etlDemo, /read_lab_dataset\("perfil-do-vault", manifest\)/);
  assert.match(etlDemo, /read_lab_dataset\("curadoria-ia", manifest\)/);
  assert.match(etlDemo, /write_local_json_snapshot/);
  assert.match(etlDemo, /write_local_dataframe_snapshot/);
  assert.match(etlDemo, /Primitivas locais vs publicadas/);
  assert.match(etlDemo, /Extract local, carga publicada/);
  assert.match(etlDemo, /avisos editoriais não bloqueantes/);
});

test("published Lab pages keep the vault shell contract", () => {
  const exportNotebooks = read("scripts/export_notebooks.mjs");
  const labIndex = read(".site/pages/lab/index.astro");
  const marimoCss = read(".site/styles/marimo-vault.css");
  const responsiveSmoke = read("scripts/smoke_responsive.mjs");
  const siteSmoke = read("scripts/smoke_site.js");
  const notebooksCheck = read("scripts/notebooks_check.mjs");

  assert.match(responsiveSmoke, /resolveNotebooksPath\(\)/);
  assert.match(responsiveSmoke, /`\/\$\{notebooksPath\}\/etl\.html`/);
  assert.match(notebooksCheck, /resolveNotebooksPath\(\)/);
  assert.match(notebooksCheck, /`public\/\$\{NOTEBOOKS_PATH\}\/vault-data\.json`/);
  assert.match(siteSmoke, /requirePublishedNotebooks && notebooksPath !== "lab"/);
  assert.match(siteSmoke, /defaultMarimoNotebookPaths\.has\(relPath\)/);

  assert.match(exportNotebooks, /data-vault-marimo-navigation/);
  assert.match(exportNotebooks, /MARIMO_VAULT_CSS/);
  assert.match(exportNotebooks, /data-vault-marimo-shell-css/);
  assert.match(exportNotebooks, /vault-lab-topbar/);
  assert.match(exportNotebooks, /vault-lab-sidebar/);
  assert.match(exportNotebooks, /data-vault-lab-footer/);
  assert.match(exportNotebooks, /feito com <span[^>]*class="[^"]*vault-lab-footer__heart[^"]*"[^>]*aria-label="amor">♥<\/span> por/);
  assert.match(exportNotebooks, /vault-seed:lab-sidebar-collapsed/);
  assert.match(exportNotebooks, /matchMedia\("\(max-width: 44rem\)"\)/);
  assert.match(exportNotebooks, /return sidebarMedia\.matches/);
  assert.match(exportNotebooks, /notebooksPath === "lab" \? "\.\/" : "\.\.\/lab\/"/);
  assert.match(exportNotebooks, /data-vault-marimo-theme-selector/);
  assert.match(exportNotebooks, /data-vault-marimo-presentation-mobile-fallback/);
  assert.doesNotMatch(exportNotebooks, /vault-marimo-fullscreen-toggle/);
  assert.doesNotMatch(marimoCss, /data-vault-marimo-presentation="slides"\] \.vault-marimo-navigation\s*\{\s*display: none/);
  assert.match(exportNotebooks, /vault-seed-slides-lite\.html/);

  assert.match(labIndex, /resolveNotebooksPath/);
  assert.match(labIndex, /vault-card-grid/);
  assert.match(labIndex, /vault-card/);
  assert.match(labIndex, /vault-button/);
  assert.match(labIndex, /vault-status/);

  assert.match(marimoCss, /#vg-tooltip-element/);
  assert.match(marimoCss, /\.vega-embed svg text/);
  assert.match(marimoCss, /var\(--popover-foreground\)/);

  for (const palette of ["oceano", "terracota"]) {
    assert.match(marimoCss, new RegExp(`data-vault-marimo-palette="${palette}"`));
  }
});

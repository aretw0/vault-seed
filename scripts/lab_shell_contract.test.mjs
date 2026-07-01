import { test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Astro and Marimo share theme storage keys", () => {
  const header = read(".site/components/Header.astro");
  const exportNotebooks = read("scripts/export_notebooks.mjs");

  for (const key of ["vault-seed:palette", "vault-seed:mode"]) {
    expect(header).toMatch(new RegExp(key));
    expect(exportNotebooks).toMatch(new RegExp(key));
  }

  expect(exportNotebooks).toMatch(/legacyThemeStorageKey = "vault-seed:marimo-theme"/);
  expect(exportNotebooks).toMatch(/legacyPaletteStorageKey = "vault-seed:marimo-palette"/);
});

test("Lab slide documentation matches the native Marimo layout contract", () => {
  const slideNotebook = read("99 - Meta e Anexos/Notebooks/apresentacoes/visao-geral.py");
  const labGuide = read("99 - Meta e Anexos/99.2 - Workflows/Usando o Lab (Notebooks Marimo).md");

  expect(slideNotebook).toMatch(/layout_file="layouts\/visao-geral\.slides\.json"/);
  expect(labGuide).toMatch(/layout_file/);
  expect(labGuide).toMatch(/apresentacoes\/layouts\/.*\.slides\.json/);
  expect(labGuide).not.toMatch(/mo\.carousel/);
  expect(labGuide).not.toMatch(/Slides não entram automaticamente/);
});

test("Lab ETL demo uses shared local/published runtime primitives", () => {
  const runtime = read("99 - Meta e Anexos/Notebooks/_lab_notebook_runtime.py");
  const etlDemo = read("99 - Meta e Anexos/Notebooks/etl-demo.py");

  expect(runtime).toMatch(/def read_lab_dataset/);
  expect(runtime).toMatch(/def lab_altair_chart/);
  expect(runtime).toMatch(/def lab_altair_status_color/);
  expect(runtime).toMatch(/def write_local_json_snapshot/);
  expect(runtime).toMatch(/def write_local_dataframe_snapshot/);
  expect(runtime).toMatch(/def write_local_markdown_note/);
  expect(runtime).toMatch(/lab_generated/);
  expect(runtime).toMatch(/def get_local_secret/);
  expect(runtime).toMatch(/def fetch_local_url_text/);
  expect(runtime).toMatch(/async def scrape_local_page_text/);
  expect(runtime).toMatch(/def extract_local_image_text/);
  expect(runtime).toMatch(/def local_vault_path/);
  expect(etlDemo).toMatch(/read_lab_dataset\("perfil-do-vault", manifest\)/);
  expect(etlDemo).toMatch(/read_lab_dataset\("curadoria-ia", manifest\)/);
  expect(etlDemo).toMatch(/write_local_json_snapshot/);
  expect(etlDemo).toMatch(/write_local_dataframe_snapshot/);
  expect(etlDemo).toMatch(/Primitivas locais vs publicadas/);
  expect(etlDemo).toMatch(/Extract local, carga publicada/);
  expect(etlDemo).toMatch(/avisos editoriais não bloqueantes/);
});

test("published Lab charts use the shared Altair theme helpers", () => {
  const runtime = read("99 - Meta e Anexos/Notebooks/_lab_notebook_runtime.py");
  const packageRuntime = read("packages/lab-runtime/src/dgk_lab_runtime/__init__.py");
  const exportHelpers = read("scripts/notebook_export_runtime_helpers.mjs");
  const labEtl = read("scripts/lab_etl_demo.mjs");
  const publicacao = read("99 - Meta e Anexos/Notebooks/analise-publicacao.py");
  const grafo = read("99 - Meta e Anexos/Notebooks/analise-grafo.py");
  const escrita = read("99 - Meta e Anexos/Notebooks/analise-escrita.py");

  expect(runtime).toMatch(/LAB_CHART_PALETTE/);
  expect(runtime).toMatch(/set_embed_options\(renderer="svg"\)/);
  expect(runtime).toMatch(/except ModuleNotFoundError:[\s\S]*xml\.etree\.ElementTree/);
  expect(runtime).toMatch(/def _runtime_cache_busted_url/);
  expect(runtime).toMatch(/open_url\(_runtime_cache_busted_url\(candidate\)\)/);
  expect(runtime).toMatch(/pyfetch\(url, cache="no-store"\)/);
  expect(packageRuntime).toMatch(/set_embed_options\(renderer="svg"\)/);
  expect(packageRuntime).toMatch(/except ModuleNotFoundError:[\s\S]*xml\.etree\.ElementTree/);
  expect(packageRuntime).toMatch(/"fetch_wasm_json"/);
  expect(packageRuntime).toMatch(/"fetch_wasm_feed"/);
  expect(packageRuntime).toMatch(/async def fetch_wasm_json\(/);
  expect(packageRuntime).toMatch(/async def fetch_wasm_feed\(/);
  expect(packageRuntime).toMatch(/pyfetch\(url, cache="no-store"\)/);
  expect(packageRuntime).toMatch(/def _runtime_cache_busted_url/);
  expect(packageRuntime).toMatch(/open_url\(_runtime_cache_busted_url\(candidate\)\)/);
  expect(exportHelpers).toMatch(/"lab_altair_chart"/);
  expect(exportHelpers).toMatch(/"lab_altair_status_color"/);
  expect(labEtl).toMatch(/function resolveNoteLink/);
  expect(labEtl).toMatch(/slugify\(note\.title\)/);
  expect(labEtl).toMatch(/inboundCount\.set\(resolved/);

  for (const notebook of [publicacao, grafo, escrita]) {
    expect(notebook).toMatch(/lab_altair_chart/);
  }

  expect(publicacao).toMatch(/lab_altair_status_color\(/);
  expect(grafo).toMatch(/mark_text/);
  expect(grafo).toMatch(/text=alt\.Text\("inbound:Q"\)/);
  expect(escrita).toMatch(/lab_altair_status_color\(/);
});

test("the manifest is the single source for presentation slides", () => {
  // The manifest-driven export_notebooks.mjs builds every presentation (slides +
  // mobile vertical fallback). The old standalone scripts/export_notebook_slides.mjs
  // hardcoded the same four presentations but without the mobile fallback — running
  // it would reintroduce the mobile RangeError. It must stay retired.
  const manifest = JSON.parse(read(".site/lab.notebooks.json"));
  const outputs = manifest
    .filter((entry) => entry.type === "presentation")
    .map((entry) => entry.output)
    .sort();
  expect(outputs, "all four presentations must be declared in the manifest so notebooks:export builds them").toEqual([
      "agentes-slides.html",
      "o-lab-slides.html",
      "publicacao-slides.html",
      "visao-geral-slides.html",
    ]);
  expect(existsSync("scripts/export_notebook_slides.mjs"), "the legacy standalone slides exporter must be removed — notebooks:export is the single source").toBe(false);
});

test("published Lab pages keep the vault shell contract", () => {
  const exportNotebooks = read("scripts/export_notebooks.mjs");
  const ensureSnapshots = read("scripts/ensure_lab_snapshots.mjs");
  const labIndex = read(".site/pages/lab/index.astro");
  const marimoCss = read(".site/styles/marimo-vault.css");
  const responsiveSmoke = read("scripts/smoke_responsive.mjs");
  const siteSmoke = read("scripts/smoke_site.js");
  const notebooksCheck = read("scripts/notebooks_check.mjs");

  expect(responsiveSmoke).toMatch(/resolveNotebooksPath\(\)/);
  expect(responsiveSmoke).toMatch(/`\/\$\{notebooksPath\}\/etl\.html`/);
  expect(notebooksCheck).toMatch(/resolveNotebooksPath\(\)/);
  expect(notebooksCheck).toMatch(/`public\/\$\{NOTEBOOKS_PATH\}\/vault-data\.json`/);
  expect(siteSmoke).toMatch(/requirePublishedNotebooks && notebooksPath !== "lab"/);
  expect(siteSmoke).toMatch(/defaultMarimoNotebookPaths\.has\(relPath\)/);

  expect(exportNotebooks).toMatch(/data-vault-marimo-navigation/);
  expect(exportNotebooks).toMatch(/ensureLabDatasetSnapshots/);
  expect(ensureSnapshots).toMatch(/missingLabDatasetSources/);
  expect(ensureSnapshots).toMatch(/pnpm run notebooks:etl/);
  expect(ensureSnapshots).toMatch(/command: "pnpm"/);
  expect(exportNotebooks).toMatch(/MARIMO_VAULT_CSS/);
  expect(exportNotebooks).toMatch(/REFARM_DS_VERDE_JARDIM_CSS/);
  expect(exportNotebooks).toMatch(/@refarm\.dev", "ds", "src", "themes", "verde-jardim\.css"/);
  expect(exportNotebooks).toMatch(/root\.dataset\.refarmTheme = "verde-jardim"/);
  expect(exportNotebooks).toMatch(/root\.dataset\.mode = resolved/);
  expect(exportNotebooks).toMatch(/data-vault-marimo-shell-css/);
  expect(exportNotebooks).toMatch(/postprocessNotebookHtml\(output, notebook\)/);
  expect(exportNotebooks).toMatch(/patchMarimoVegaRendererAssets/);
  expect(exportNotebooks).toMatch(/renderer:r\?\.renderer\?\?"canvas"/);
  expect(exportNotebooks).toMatch(/vault-lab-topbar/);
  expect(exportNotebooks).toMatch(/vault-lab-sidebar/);
  expect(exportNotebooks).toMatch(/data-vault-lab-footer/);
  expect(exportNotebooks).toMatch(/import \{ vaultKudos \} from "\.\.\/\.site\/lib\/vault-config\.mjs"/);
  expect(exportNotebooks).toMatch(/function labKudosHtml\(\)/);
  expect(exportNotebooks).toMatch(/vault-lab-footer__heart/);
  expect(exportNotebooks).not.toMatch(/por <a href="https:\/\/github\.com\/aretw0">aretw0<\/a>/);
  expect(exportNotebooks).toMatch(/vault-seed:lab-sidebar-collapsed/);
  expect(exportNotebooks).toMatch(/matchMedia\("\(max-width: 44rem\)"\)/);
  expect(exportNotebooks).toMatch(/return sidebarMedia\.matches/);
  expect(exportNotebooks).toMatch(/notebooksPath === "lab" \? "\.\/" : "\.\.\/lab\/"/);
  expect(exportNotebooks).toMatch(/data-vault-marimo-theme-selector/);
  expect(exportNotebooks).toMatch(/data-vault-marimo-presentation-mobile-fallback/);
  expect(exportNotebooks).not.toMatch(/isFirefox/);
  expect(exportNotebooks).not.toMatch(/vault-marimo-fullscreen-toggle/);
  expect(marimoCss).not.toMatch(/data-vault-marimo-presentation="slides"\] \.vault-marimo-navigation\s*\{\s*display: none/);
  expect(exportNotebooks).toMatch(/LEGACY_OVERVIEW_PRESENTATION_OUTPUT = "vault-seed-slides\.html"/);
  expect(exportNotebooks).toMatch(/copyLegacyOverviewPresentationAlias/);
  // Mobile presentations no longer use a hardcoded lite page; every presentation
  // redirects mobile to its vertical sibling (real content, native scroll, no reveal).
  expect(exportNotebooks).not.toMatch(/vault-seed-slides-lite/);
  expect(exportNotebooks).not.toMatch(/presentationLiteHtml/);
  expect(exportNotebooks).toMatch(/verticalOutputFor/);
  expect(exportNotebooks).toMatch(/exportNotebookVariant\(source, verticalOutput, \{ stripLayout: true \}\)/);
  expect(exportNotebooks).toMatch(/injectPresentationMobileFallback\(output, verticalOutputFor\(notebook\.output\)\)/);
  expect(exportNotebooks).toMatch(/postprocessVerticalHtml/);

  expect(labIndex).toMatch(/resolveNotebooksPath/);
  expect(labIndex).toMatch(/vault-card-grid/);
  expect(labIndex).toMatch(/vault-card/);
  expect(labIndex).toMatch(/vault-button/);
  expect(labIndex).toMatch(/vault-status/);

  expect(marimoCss).toMatch(/#vg-tooltip-element/);
  expect(marimoCss).toMatch(/\.vega-embed svg text/);
  expect(marimoCss).toMatch(/marimo-table[\s\S]*width: fit-content/);
  expect(marimoCss).toMatch(/data-vault-marimo-presentation="slides"[\s\S]*\.mo-slide-content \.markdown table[\s\S]*display: table/);
  expect(responsiveSmoke).toMatch(/assertPublishedVegaUsesSvg/);
  expect(responsiveSmoke).toMatch(/\.chart-wrapper canvas/);
  expect(responsiveSmoke).toMatch(/\.chart-wrapper svg/);
  expect(marimoCss).toMatch(/var\(--popover-foreground\)/);
  expect(marimoCss).toMatch(/\.vault-lab-footer[\s\S]*width: fit-content/);
  expect(marimoCss).toMatch(/\.vault-lab-footer[\s\S]*white-space: nowrap/);

  for (const palette of ["oceano", "terracota"]) {
    expect(marimoCss).toMatch(new RegExp(`data-vault-marimo-palette="${palette}"`));
  }
});

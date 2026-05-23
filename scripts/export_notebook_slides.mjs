#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";
import { writeVaultData } from "./generate_vault_data.mjs";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NOTEBOOK =
  "99 - Meta e Anexos/Notebooks/apresentacao-vault-seed.py";
const OUTPUT = process.env.VAULT_SLIDES_OUTPUT ||
  join(ROOT, "dist", "lab", "vault-seed-slides.html");
const NAVIGATION_MARKER = "data-vault-marimo-navigation";
const PRESENTATION_EXIT_MARKER = "data-vault-marimo-presentation-exit";

const navigationHtml = String.raw`
<nav class="vault-marimo-navigation" data-vault-marimo-navigation aria-label="Navegação do vault">
  <a href="../">Vault</a>
  <a href="./">Lab</a>
</nav>
`;

const presentationExitHtml = String.raw`
<a class="vault-marimo-presentation-exit" data-vault-marimo-presentation-exit href="./" aria-label="Sair da apresentação e voltar para o Lab">Sair</a>
<script>
(() => {
  const exit = document.querySelector("[data-vault-marimo-presentation-exit]");
  if (!exit) return;
  exit.addEventListener("click", async (event) => {
    event.preventDefault();
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    window.location.href = exit.getAttribute("href") || "./";
  });
})();
</script>
`;

function injectNotebookNavigation(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  if (html.includes(NAVIGATION_MARKER)) {
    return;
  }
  if (!html.includes("</body>")) {
    throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
  }
  writeFileSync(htmlPath, html.replace("</body>", `${navigationHtml}\n</body>`));
}

function injectPresentationExit(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  if (html.includes(PRESENTATION_EXIT_MARKER)) {
    return;
  }
  if (!html.includes("</body>")) {
    throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
  }
  writeFileSync(htmlPath, html.replace("</body>", `${presentationExitHtml}\n</body>`));
}

const { data, outDir: sourceDataDir } = writeVaultData({ cwd: ROOT });
console.log(`[notebooks:data] ${data.noteCount} notas`);
mkdirSync(dirname(OUTPUT), { recursive: true });
mkdirSync(join(dirname(OUTPUT), "assets"), { recursive: true });
const { data: datasetData } = buildLabDatasets({ cwd: ROOT, targetRoot: dirname(OUTPUT) });
console.log(`[notebooks:etl] ${datasetData.datasetCount} dataset(s)`);
copyFileSync(
  join(sourceDataDir, "vault-data.json"),
  join(dirname(OUTPUT), "vault-data.json"),
);
copyFileSync(
  join(sourceDataDir, "vault-data.json"),
  join(dirname(OUTPUT), "assets", "vault-data.json"),
);

const result = spawnSync("uv", [
  "run",
  "--no-project",
  "--with-requirements",
  "requirements.txt",
  "marimo",
  "export",
  "html-wasm",
  join(ROOT, NOTEBOOK),
  "--output",
  OUTPUT,
  "--force",
], {
  cwd: ROOT,
  env: uvEnv(),
  stdio: "inherit",
});

if (result.error) {
  console.error(
    `[notebooks:export:slides] não foi possível iniciar uv/Marimo: ${result.error.message}`,
  );
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    "[notebooks:export:slides] falha ao exportar apresentação HTML WebAssembly.",
  );
  process.exit(result.status ?? 1);
}

injectNotebookNavigation(OUTPUT);
injectPresentationExit(OUTPUT);
console.log(`[notebooks:export:slides] ${OUTPUT}`);

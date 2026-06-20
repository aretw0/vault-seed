#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";
import { writeVaultData } from "./generate_vault_data.mjs";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";
import { ensureLabDatasetSnapshots } from "./ensure_lab_snapshots.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PRESENTATIONS = [
  {
    notebook: "99 - Meta e Anexos/Notebooks/apresentacoes/visao-geral.py",
    output: "visao-geral-slides.html",
  },
  {
    notebook: "99 - Meta e Anexos/Notebooks/apresentacoes/o-lab.py",
    output: "o-lab-slides.html",
  },
  {
    notebook: "99 - Meta e Anexos/Notebooks/apresentacoes/publicacao.py",
    output: "publicacao-slides.html",
  },
  {
    notebook: "99 - Meta e Anexos/Notebooks/apresentacoes/agentes.py",
    output: "agentes-slides.html",
  },
];
const outDir = join(ROOT, "dist", "lab");
const NAVIGATION_MARKER = "data-vault-marimo-navigation";
const PRESENTATION_FULLSCREEN_MARKER = "data-vault-marimo-presentation-fullscreen";

const navigationHtml = String.raw`
<nav class="vault-marimo-navigation" data-vault-marimo-navigation aria-label="Navegação do vault">
  <a href="../">Vault</a>
  <a href="./">Lab</a>
</nav>
`;

const presentationFullscreenHtml = String.raw`
<script data-vault-marimo-presentation-fullscreen>
(() => {
  const fullScreenPattern = /full\s*screen|fullscreen|tela cheia/i;
  const enterIcon = "⛶";
  const exitIcon = "×";
  const enterLabel = "Abrir em tela cheia";
  const exitLabel = "Fechar tela cheia";
  const originalLabels = new WeakMap();
  document.documentElement.dataset.vaultMarimoPresentation = "slides";

  function markCoverSlide() {
    const slides = Array.from(document.querySelectorAll(".mo-slide-content"));
    slides.forEach((slide) => {
      delete slide.dataset.vaultMarimoSlideCover;
    });
    if (slides[0]) {
      slides[0].dataset.vaultMarimoSlideCover = "true";
    }
  }

  function candidates() {
    return Array.from(document.querySelectorAll("button, [role='button'], [role='menuitem']"));
  }

  function textOf(button) {
    return [
      button.textContent || "",
      button.getAttribute("aria-label") || "",
      button.getAttribute("title") || "",
    ].join(" ");
  }

  function isFullscreenButton(button) {
    return fullScreenPattern.test(textOf(button)) || originalLabels.has(button);
  }

  function setLabel(button, active) {
    if (!originalLabels.has(button)) {
      originalLabels.set(button, {
        text: button.textContent || "",
        aria: button.getAttribute("aria-label"),
        title: button.getAttribute("title"),
      });
    }

    button.dataset.vaultMarimoFullscreenButton = "true";
    const icon = active ? exitIcon : enterIcon;
    const label = active ? exitLabel : enterLabel;
    if ((button.textContent || "").trim() !== icon) button.textContent = icon;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function sync() {
    const active = Boolean(document.fullscreenElement);
    markCoverSlide();
    candidates().filter(isFullscreenButton).forEach((button) => setLabel(button, active));
  }

  document.addEventListener("fullscreenchange", sync);
  new MutationObserver(sync).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  sync();
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

function injectPresentationFullscreen(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  if (html.includes(PRESENTATION_FULLSCREEN_MARKER)) {
    return;
  }
  if (!html.includes("</body>")) {
    throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
  }
  writeFileSync(
    htmlPath,
    html.replace("</body>", `${presentationFullscreenHtml}\n</body>`),
  );
}

const { data, outDir: sourceDataDir } = writeVaultData({ cwd: ROOT });
console.log(`[notebooks:data] ${data.noteCount} notas`);
mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "assets"), { recursive: true });
ensureLabDatasetSnapshots({ cwd: ROOT });
const { data: datasetData } = buildLabDatasets({ cwd: ROOT, targetRoot: outDir });
console.log(`[notebooks:etl] ${datasetData.datasetCount} dataset(s)`);
copyFileSync(
  join(sourceDataDir, "vault-data.json"),
  join(outDir, "vault-data.json"),
);
copyFileSync(
  join(sourceDataDir, "vault-data.json"),
  join(outDir, "assets", "vault-data.json"),
);

for (const { notebook, output } of PRESENTATIONS) {
  const outputPath = join(outDir, output);
  const result = spawnSync("uv", [
    "run",
    "--no-project",
    "--with-requirements",
    "requirements.txt",
    "marimo",
    "export",
    "html-wasm",
    join(ROOT, notebook),
    "--output",
    outputPath,
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
      `[notebooks:export:slides] falha ao exportar ${notebook}.`,
    );
    process.exit(result.status ?? 1);
  }

  injectNotebookNavigation(outputPath);
  injectPresentationFullscreen(outputPath);
  console.log(`[notebooks:export:slides] ${outputPath}`);
}

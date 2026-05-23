#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";
import { writeVaultData } from "./generate_vault_data.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const manifestPath = join(ROOT, ".site", "lab.notebooks.json");
const notebooksPath = process.env.VAULT_NOTEBOOKS_PATH || "lab";
const outputRoot = args.has("--public")
  ? join(ROOT, "public")
  : process.env.VAULT_NOTEBOOKS_OUTPUT_DIR || join(ROOT, "dist");
const outDir = join(outputRoot, notebooksPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const THEME_SELECTOR_MARKER = "data-vault-marimo-theme-selector";
const themeSelectorMode = process.env.VAULT_MARIMO_THEME_SELECTOR;
const isVaultSeedRepo = String(packageJson.repository?.url ?? "").includes("aretw0/vault-seed");
const shouldInjectThemeSelector =
  themeSelectorMode === "1" || (themeSelectorMode !== "0" && isVaultSeedRepo);

const { data, outDir: sourceDataDir } = writeVaultData({ cwd: ROOT, notebooksPath });
console.log(`[notebooks:data] ${data.noteCount} notas`);

const themeSelectorHtml = String.raw`
<div class="vault-marimo-theme-selector" data-vault-marimo-theme-selector role="group" aria-label="Tema do notebook">
  <select data-vault-marimo-palette-option aria-label="Paleta do notebook">
    <option value="verde-jardim">Verde jardim</option>
    <option value="oceano">Oceano</option>
    <option value="terracota">Terracota</option>
  </select>
  <button type="button" data-vault-marimo-theme-option="system" aria-pressed="true">Sistema</button>
  <button type="button" data-vault-marimo-theme-option="light" aria-pressed="false">Claro</button>
  <button type="button" data-vault-marimo-theme-option="dark" aria-pressed="false">Escuro</button>
</div>
<script>
(() => {
  const themeStorageKey = "vault-seed:marimo-theme";
  const paletteStorageKey = "vault-seed:marimo-palette";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const palettes = ["verde-jardim", "oceano", "terracota"];

  function resolveTheme(choice) {
    return choice === "system" ? (media.matches ? "dark" : "light") : choice;
  }

  function setClass(target, resolved) {
    if (!target) return;
    target.classList.toggle("dark", resolved === "dark");
    target.classList.toggle("dark-theme", resolved === "dark");
    target.classList.toggle("light", resolved === "light");
    target.classList.toggle("light-theme", resolved === "light");
  }

  function applyTheme(choice, paletteChoice) {
    const selected = ["system", "light", "dark"].includes(choice) ? choice : "system";
    const palette = palettes.includes(paletteChoice) ? paletteChoice : "verde-jardim";
    const resolved = resolveTheme(selected);

    root.dataset.vaultMarimoPalette = palette;
    root.dataset.vaultMarimoThemeChoice = selected;
    root.dataset.vaultMarimoTheme = resolved;
    setClass(root, resolved);
    setClass(document.body, resolved);

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      const active = button.dataset.vaultMarimoThemeOption === selected;
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-vault-marimo-palette-option]").forEach((select) => {
      select.value = palette;
    });
  }

  function init() {
    const savedTheme = localStorage.getItem(themeStorageKey) || "system";
    const savedPalette = localStorage.getItem(paletteStorageKey) || "verde-jardim";
    applyTheme(savedTheme, savedPalette);

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.vaultMarimoThemeOption || "system";
        localStorage.setItem(themeStorageKey, next);
        applyTheme(next, localStorage.getItem(paletteStorageKey) || "verde-jardim");
      });
    });

    document.querySelectorAll("[data-vault-marimo-palette-option]").forEach((select) => {
      select.addEventListener("change", () => {
        const next = select.value || "verde-jardim";
        localStorage.setItem(paletteStorageKey, next);
        applyTheme(localStorage.getItem(themeStorageKey) || "system", next);
      });
    });

    media.addEventListener("change", () => {
      applyTheme(
        localStorage.getItem(themeStorageKey) || "system",
        localStorage.getItem(paletteStorageKey) || "verde-jardim"
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
</script>
`;

function injectThemeSelector(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  if (html.includes(THEME_SELECTOR_MARKER)) {
    return;
  }
  if (!html.includes("</body>")) {
    throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
  }
  writeFileSync(htmlPath, html.replace("</body>", `${themeSelectorHtml}\n</body>`));
}

function copyVaultDataForWasm() {
  const source = join(sourceDataDir, "vault-data.json");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "assets"), { recursive: true });
  copyFileSync(source, join(outDir, "vault-data.json"));
  copyFileSync(source, join(outDir, "assets", "vault-data.json"));
}

mkdirSync(outDir, { recursive: true });
copyVaultDataForWasm();

for (const notebook of manifest.filter((entry) => entry.publish)) {
  const source = join(ROOT, notebook.source);
  const output = join(outDir, notebook.output);
  mkdirSync(dirname(output), { recursive: true });
  console.log(`export notebook: ${notebook.source} -> ${outputRoot.replace(ROOT, "").replace(/^[\\/]/, "")}/${notebooksPath}/${notebook.output}`);
  const result = spawnSync("uv", [
    "run",
    "--no-project",
    "--with-requirements",
    "requirements.txt",
    "marimo",
    "export",
    "html-wasm",
    source,
    "--output",
    output,
  ], {
    cwd: ROOT,
    env: uvEnv(),
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`[notebooks:export] não foi possível iniciar o uv/Marimo: ${result.error.message}`);
    console.error("[notebooks:export] instale uv e rode novamente: https://docs.astral.sh/uv/getting-started/installation/");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  if (shouldInjectThemeSelector) {
    injectThemeSelector(output);
  }
}

#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = join(ROOT, ".site", "lab.notebooks.json");
const notebooksPath = process.env.VAULT_NOTEBOOKS_PATH || "lab";
const outDir = join(ROOT, "dist", notebooksPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const THEME_SELECTOR_MARKER = "data-vault-marimo-theme-selector";

const themeSelectorHtml = String.raw`
<div class="vault-marimo-theme-selector" data-vault-marimo-theme-selector role="group" aria-label="Tema do notebook">
  <button type="button" data-vault-marimo-theme-option="system" aria-pressed="true">Sistema</button>
  <button type="button" data-vault-marimo-theme-option="light" aria-pressed="false">Claro</button>
  <button type="button" data-vault-marimo-theme-option="dark" aria-pressed="false">Escuro</button>
</div>
<script>
(() => {
  const storageKey = "vault-seed:marimo-theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

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

  function applyTheme(choice) {
    const selected = ["system", "light", "dark"].includes(choice) ? choice : "system";
    const resolved = resolveTheme(selected);

    root.dataset.vaultMarimoThemeChoice = selected;
    root.dataset.vaultMarimoTheme = resolved;
    setClass(root, resolved);
    setClass(document.body, resolved);

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      const active = button.dataset.vaultMarimoThemeOption === selected;
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function init() {
    const saved = localStorage.getItem(storageKey) || "system";
    applyTheme(saved);

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.vaultMarimoThemeOption || "system";
        localStorage.setItem(storageKey, next);
        applyTheme(next);
      });
    });

    media.addEventListener("change", () => {
      applyTheme(localStorage.getItem(storageKey) || "system");
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

mkdirSync(outDir, { recursive: true });

for (const notebook of manifest.filter((entry) => entry.publish)) {
  const source = join(ROOT, notebook.source);
  const output = join(outDir, notebook.output);
  mkdirSync(dirname(output), { recursive: true });
  console.log(`export notebook: ${notebook.source} -> dist/${notebooksPath}/${notebook.output}`);
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
  injectThemeSelector(output);
}

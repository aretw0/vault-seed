#!/usr/bin/env node
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";
import { resolveNotebooksPath } from "./notebook_path.mjs";
import { writeVaultData } from "./generate_vault_data.mjs";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";
import { replaceImportAndInjectRuntimeHelpers } from "./notebook_export_runtime_helpers.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const manifestPath = join(ROOT, ".site", "lab.notebooks.json");
const notebooksPath = resolveNotebooksPath();
const outputRoot = args.has("--public")
	? join(ROOT, "public")
	: process.env.VAULT_NOTEBOOKS_OUTPUT_DIR || join(ROOT, "dist");
const outDir = join(outputRoot, notebooksPath);
const notebookRuntimeHelperPath = join(
	ROOT,
	"99 - Meta e Anexos",
	"Notebooks",
	"_lab_notebook_runtime.py",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(
	readFileSync(join(ROOT, "package.json"), "utf8"),
);
const THEME_SELECTOR_MARKER = "data-vault-marimo-theme-selector";
const NAVIGATION_MARKER = "data-vault-marimo-navigation";
const PRESENTATION_FULLSCREEN_MARKER =
	"data-vault-marimo-presentation-fullscreen";
const themeSelectorMode = process.env.VAULT_MARIMO_THEME_SELECTOR;
const isVaultSeedRepo = String(packageJson.repository?.url ?? "").includes(
	"aretw0/vault-seed",
);
const shouldInjectThemeSelector =
	themeSelectorMode === "1" || (themeSelectorMode !== "0" && isVaultSeedRepo);

const { data, outDir: sourceDataDir } = writeVaultData({
	cwd: ROOT,
	notebooksPath,
});
console.log(`[notebooks:data] ${data.noteCount} notas`);
const { data: datasetData } = buildLabDatasets({
	cwd: ROOT,
	targetRoot: outDir,
});
console.log(`[notebooks:etl] ${datasetData.datasetCount} dataset(s)`);

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function labNavigationHtml(currentOutput) {
	const labIndexHref = notebooksPath === "lab" ? "./" : "../lab/";

	if (currentOutput === "vault-seed-slides.html") {
		return String.raw`
<nav class="vault-marimo-navigation" data-vault-marimo-navigation aria-label="Navegação do vault">
  <a href="../">Vault</a>
  <a href="${labIndexHref}">Lab</a>
</nav>
`;
	}

	const notebookLinks = manifest
		.filter((entry) => entry.publish)
		.map((entry) => {
			const active = entry.output === currentOutput;
			return `<a href="./${escapeHtml(entry.output)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(entry.title)}</a>`;
		})
		.join("\n      ");

	return String.raw`
<div class="vault-marimo-navigation" data-vault-marimo-navigation>
  <header class="vault-lab-topbar" aria-label="Navegação principal do Lab">
    <button class="vault-lab-sidebar-toggle" type="button" data-vault-lab-sidebar-toggle aria-expanded="true" aria-controls="vault-lab-sidebar">Menu</button>
    <a class="vault-lab-brand" href="../">Vault</a>
    <a class="vault-lab-section" href="${labIndexHref}">Lab</a>
  </header>
  <aside class="vault-lab-sidebar" id="vault-lab-sidebar" aria-label="Notebooks publicados">
    <div class="vault-lab-sidebar__title">Notebooks</div>
    <nav class="vault-lab-notebook-list">
      ${notebookLinks}
    </nav>
  </aside>
</div>
<script data-vault-marimo-navigation-script>
(() => {
  const root = document.documentElement;
  const key = "vault-seed:lab-sidebar-collapsed";
  const toggle = document.querySelector("[data-vault-lab-sidebar-toggle]");
  root.dataset.vaultMarimoShell = "lab";

  function apply(collapsed) {
    root.dataset.vaultLabSidebar = collapsed ? "collapsed" : "expanded";
    toggle?.setAttribute("aria-expanded", String(!collapsed));
  }

  const saved = localStorage.getItem(key);
  apply(saved === "1");

  toggle?.addEventListener("click", () => {
    const collapsed = root.dataset.vaultLabSidebar !== "collapsed";
    localStorage.setItem(key, collapsed ? "1" : "0");
    apply(collapsed);
  });
})();
</script>
`;
}

const themeSelectorHtml = String.raw`
<div class="vault-marimo-theme-selector" data-vault-marimo-theme-selector>
  <button class="vault-marimo-theme-toggle" type="button" data-vault-marimo-theme-toggle aria-expanded="false" aria-controls="vault-marimo-theme-panel">Tema</button>
  <div class="vault-marimo-theme-panel" id="vault-marimo-theme-panel" data-vault-marimo-theme-panel role="group" aria-label="Tema do notebook">
    <select data-vault-marimo-palette-option aria-label="Paleta do notebook">
      <option value="verde-jardim">Verde jardim</option>
      <option value="oceano">Oceano</option>
      <option value="terracota">Terracota</option>
    </select>
    <button type="button" data-vault-marimo-theme-option="system" aria-pressed="true">Sistema</button>
    <button type="button" data-vault-marimo-theme-option="light" aria-pressed="false">Claro</button>
    <button type="button" data-vault-marimo-theme-option="dark" aria-pressed="false">Escuro</button>
  </div>
</div>
<script>
(() => {
  const themeStorageKey = "vault-seed:mode";
  const paletteStorageKey = "vault-seed:palette";
  const legacyThemeStorageKey = "vault-seed:marimo-theme";
  const legacyPaletteStorageKey = "vault-seed:marimo-palette";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const palettes = ["verde-jardim", "oceano", "terracota"];
  const panelStorageKey = "vault-seed:marimo-theme-panel";

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

  function syncMarimoConfig(resolved) {
    const mountConfig = window.__MARIMO_MOUNT_CONFIG__;
    if (mountConfig?.config?.display) {
      mountConfig.config.display.theme = resolved;
    }
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
    syncMarimoConfig(resolved);

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      const active = button.dataset.vaultMarimoThemeOption === selected;
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-vault-marimo-palette-option]").forEach((select) => {
      select.value = palette;
    });
  }

  function applyPanel(open) {
    root.dataset.vaultMarimoThemePanel = open ? "open" : "closed";
    document.querySelectorAll("[data-vault-marimo-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", String(open));
    });
  }

  function init() {
    const savedTheme = localStorage.getItem(themeStorageKey) || localStorage.getItem(legacyThemeStorageKey) || "system";
    const savedPalette = localStorage.getItem(paletteStorageKey) || localStorage.getItem(legacyPaletteStorageKey) || "verde-jardim";
    applyTheme(savedTheme, savedPalette);
    applyPanel(localStorage.getItem(panelStorageKey) === "open");

    document.querySelectorAll("[data-vault-marimo-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const open = root.dataset.vaultMarimoThemePanel !== "open";
        localStorage.setItem(panelStorageKey, open ? "open" : "closed");
        applyPanel(open);
      });
    });

    document.querySelectorAll("[data-vault-marimo-theme-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.dataset.vaultMarimoThemeOption || "system";
        localStorage.setItem(themeStorageKey, next);
        localStorage.setItem(legacyThemeStorageKey, next);
        applyTheme(next, localStorage.getItem(paletteStorageKey) || localStorage.getItem(legacyPaletteStorageKey) || "verde-jardim");
        window.location.reload();
      });
    });

    document.querySelectorAll("[data-vault-marimo-palette-option]").forEach((select) => {
      select.addEventListener("change", () => {
        const next = select.value || "verde-jardim";
        localStorage.setItem(paletteStorageKey, next);
        localStorage.setItem(legacyPaletteStorageKey, next);
        applyTheme(localStorage.getItem(themeStorageKey) || localStorage.getItem(legacyThemeStorageKey) || "system", next);
        window.location.reload();
      });
    });

    media.addEventListener("change", () => {
      applyTheme(
        localStorage.getItem(themeStorageKey) || localStorage.getItem(legacyThemeStorageKey) || "system",
        localStorage.getItem(paletteStorageKey) || localStorage.getItem(legacyPaletteStorageKey) || "verde-jardim"
      );
    });
  }

  init();
})();
</script>
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

function injectNotebookNavigation(htmlPath, currentOutput) {
	const html = readFileSync(htmlPath, "utf8");
	if (html.includes(NAVIGATION_MARKER)) {
		return;
	}
	if (!html.includes("</body>")) {
		throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
	}
	writeFileSync(
		htmlPath,
		html.replace("</body>", `${labNavigationHtml(currentOutput)}\n</body>`),
	);
}

function injectThemeSelector(htmlPath) {
	const html = readFileSync(htmlPath, "utf8");
	if (html.includes(THEME_SELECTOR_MARKER)) {
		return;
	}
	if (!html.includes("</body>")) {
		throw new Error(`HTML exportado sem </body>: ${htmlPath}`);
	}
	writeFileSync(
		htmlPath,
		html.replace("</body>", `${themeSelectorHtml}\n</body>`),
	);
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

function copyVaultDataForWasm() {
	const source = join(sourceDataDir, "vault-data.json");
	mkdirSync(outDir, { recursive: true });
	mkdirSync(join(outDir, "assets"), { recursive: true });
	copyFileSync(source, join(outDir, "vault-data.json"));
	copyFileSync(source, join(outDir, "assets", "vault-data.json"));
}

function removeObsoleteDefaultNotebookExports() {
	if (notebooksPath === "lab" || outputRoot === join(ROOT, "public")) return;

	const staleLabDir = join(outputRoot, "lab");
	for (const notebook of manifest.filter((entry) => entry.publish)) {
		rmSync(join(staleLabDir, notebook.output), { force: true });
	}
	for (const generatedPath of [
		"vault-data.json",
		join("assets", "vault-data.json"),
		join("datasets", "manifest.json"),
		join("assets", "datasets", "manifest.json"),
	]) {
		rmSync(join(staleLabDir, generatedPath), { force: true });
	}
	rmSync(join(staleLabDir, "assets"), { recursive: true, force: true });
	rmSync(join(staleLabDir, "datasets"), { recursive: true, force: true });
}

function prepareNotebookSourceForExport(source) {
	const sourceCode = readFileSync(source, "utf8");
	const runtimeHelperSource = readFileSync(notebookRuntimeHelperPath, "utf8");
	const transformedSource = replaceImportAndInjectRuntimeHelpers(sourceCode, {
		runtimeHelperSource,
	});
	const tmpDir = mkdtempSync(join(tmpdir(), "vault-seed-lab-notebook-"));
	const sourceLayoutsDir = join(dirname(source), "layouts");
	if (existsSync(sourceLayoutsDir)) {
		cpSync(sourceLayoutsDir, join(tmpDir, "layouts"), { recursive: true });
	}
	const exportSource = join(tmpDir, basename(source));
	writeFileSync(exportSource, `${transformedSource}\n`, "utf8");

	return {
		source: exportSource,
		cleanup: () => rmSync(tmpDir, { recursive: true, force: true }),
	};
}

mkdirSync(outDir, { recursive: true });
removeObsoleteDefaultNotebookExports();
copyVaultDataForWasm();

for (const notebook of manifest.filter((entry) => entry.publish)) {
	const source = join(ROOT, notebook.source);
	const output = join(outDir, notebook.output);
	const prepared = prepareNotebookSourceForExport(source);
	mkdirSync(dirname(output), { recursive: true });
	console.log(
		`export notebook: ${notebook.source} -> ${outputRoot.replace(ROOT, "").replace(/^[\\/]/, "")}/${notebooksPath}/${notebook.output}`,
	);

	try {
		const result = spawnSync(
			"uv",
			[
				"run",
				"--no-project",
				"--with-requirements",
				"requirements.txt",
				"marimo",
				"export",
				"html-wasm",
				prepared.source,
				"--output",
				output,
			],
			{
				cwd: ROOT,
				env: uvEnv(),
				stdio: "inherit",
			},
		);
		if (result.error) {
			console.error(
				`[notebooks:export] não foi possível iniciar o uv/Marimo: ${result.error.message}`,
			);
			console.error(
				"[notebooks:export] instale uv e rode novamente: https://docs.astral.sh/uv/getting-started/installation/",
			);
			process.exit(1);
		}
		if (result.status !== 0) {
			process.exit(result.status ?? 1);
		}
	} finally {
		if (prepared.cleanup) {
			prepared.cleanup();
		}
	}

	injectNotebookNavigation(output, notebook.output);
	if (notebook.output === "vault-seed-slides.html") {
		injectPresentationFullscreen(output);
	}
	if (shouldInjectThemeSelector) {
		injectThemeSelector(output);
	}
}

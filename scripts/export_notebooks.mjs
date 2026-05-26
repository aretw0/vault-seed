#!/usr/bin/env node
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
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
const SCRIPT_PATH = fileURLToPath(import.meta.url);
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
const PRESENTATION_MOBILE_FALLBACK_MARKER =
	"data-vault-marimo-presentation-mobile-fallback";
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

  const sidebarMedia = window.matchMedia("(max-width: 44rem)");

  function preferredCollapsed() {
    const saved = localStorage.getItem(key);
    if (saved !== null) return saved === "1";
    return sidebarMedia.matches;
  }

  apply(preferredCollapsed());

  sidebarMedia.addEventListener("change", () => {
    if (localStorage.getItem(key) === null) apply(sidebarMedia.matches);
  });

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

const presentationMobileFallbackRedirectHtml = String.raw`
<script data-vault-marimo-presentation-mobile-fallback>
(() => {
  const isFirefox = /Firefox\/\d+|FxiOS/i.test(navigator.userAgent);
  const isMobileViewport = window.matchMedia("(max-width: 44rem), (pointer: coarse)").matches;
  if (isFirefox && isMobileViewport && !location.pathname.endsWith("vault-seed-slides-lite.html")) {
    location.replace("./vault-seed-slides-lite.html");
  }
})();
</script>
`;

function presentationLiteHtml() {
	return String.raw`<!doctype html>
<html lang="pt-BR" data-vault-marimo-theme="light" data-vault-marimo-palette="verde-jardim">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vault Seed — slides leves</title>
  <style>
${readFileSync(join(ROOT, ".site", "styles", "marimo-vault.css"), "utf8")}
    body { margin: 0; }
    .vault-lite-slides { max-width: min(56rem, calc(100vw - 2rem)); margin: 0 auto; padding: clamp(1rem, 4vw, 3rem) 1rem 4rem; }
    .vault-lite-nav { display: flex; gap: .75rem; flex-wrap: wrap; margin-block-end: 1.5rem; }
    .vault-lite-slide { border: 1px solid var(--border); border-radius: 1rem; background: var(--card); padding: clamp(1rem, 3vw, 2rem); margin-block: 1rem; box-shadow: 0 .75rem 2rem color-mix(in srgb, var(--foreground) 8%, transparent); }
    .vault-lite-slide h1, .vault-lite-slide h2 { color: var(--primary); margin-block-start: 0; }
    .vault-lite-slide table { width: 100%; border-collapse: collapse; }
    .vault-lite-slide th, .vault-lite-slide td { border: 1px solid var(--border); padding: .5rem; text-align: left; }
  </style>
</head>
<body>
  <main class="vault-lite-slides">
    <nav class="vault-lite-nav" aria-label="Navegação dos slides leves">
      <a href="../">Vault</a>
      <a href="./">Lab</a>
      <a href="./vault-seed-slides.html">Abrir versão interativa</a>
    </nav>

    <section class="vault-lite-slide"><h1>vault-seed</h1><p>Um vault local-first com site, automação e notebooks no mesmo repositório.</p></section>
    <section class="vault-lite-slide"><h2>A tese</h2><p>O vault não é só uma pasta de Markdown. Ele é um sistema versionado para pensar, publicar, automatizar e analisar o próprio conhecimento.</p></section>
    <section class="vault-lite-slide"><h2>O que vem junto</h2><table><tr><th>Camada</th><th>Papel</th></tr><tr><td>Notas Markdown</td><td>conhecimento editável localmente</td></tr><tr><td>Astro/Starlight</td><td>site publicado a partir do vault</td></tr><tr><td>GitHub Actions</td><td>validação e publicação automática</td></tr><tr><td>Marimo</td><td>Lab interativo para leitura e análise</td></tr><tr><td>Agentes</td><td>edição assistida via arquivos, comandos e diff</td></tr></table></section>
    <section class="vault-lite-slide"><h2>Local-first</h2><p>O trabalho diário acontece no computador: notas, notebooks, scripts e commits. O site publicado é um artefato empacotado dessa base local.</p></section>
    <section class="vault-lite-slide"><h2>Lab</h2><ul><li>localmente: Python roda no computador;</li><li>publicado: HTML WebAssembly roda no navegador;</li><li>layouts nativos do Marimo permitem modos vertical, grid e slides.</li></ul></section>
    <section class="vault-lite-slide"><h2>Governança</h2><p>Criar um notebook não publica esse notebook. A publicação passa pelo manifesto <code>.site/lab.notebooks.json</code>.</p></section>
    <section class="vault-lite-slide"><h2>Próximo passo</h2><p>Distribuir um vault pronto para uso, publicar documentação viva, criar notebooks de análise e separar ETL local de visualização empacotada.</p></section>
  </main>
</body>
</html>
`;
}

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

function injectPresentationMobileFallback(htmlPath) {
	const html = readFileSync(htmlPath, "utf8");
	if (html.includes(PRESENTATION_MOBILE_FALLBACK_MARKER)) {
		return;
	}
	if (!html.includes("<head>")) {
		throw new Error(`HTML exportado sem <head>: ${htmlPath}`);
	}
	writeFileSync(
		htmlPath,
		html.replace("<head>", `<head>\n${presentationMobileFallbackRedirectHtml}`),
	);
}

function writePresentationLiteFallback() {
	writeFileSync(
		join(outDir, "vault-seed-slides-lite.html"),
		presentationLiteHtml(),
		"utf8",
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

function listFilesRecursive(dir) {
	if (!existsSync(dir)) return [];

	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...listFilesRecursive(fullPath));
		} else if (entry.isFile()) {
			files.push(fullPath);
		}
	}
	return files;
}

function notebookExportDependencies(source) {
	return [
		source,
		notebookRuntimeHelperPath,
		manifestPath,
		SCRIPT_PATH,
		join(ROOT, "pyproject.toml"),
		join(ROOT, ".site", "styles", "marimo-vault.css"),
		...listFilesRecursive(join(dirname(source), "layouts")),
	];
}

function isNotebookExportFresh(output, source) {
	if (!existsSync(output)) return false;

	const outputMtime = statSync(output).mtimeMs;
	return notebookExportDependencies(source).every((dependency) => {
		if (!existsSync(dependency)) return true;
		return statSync(dependency).mtimeMs <= outputMtime;
	});
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
	mkdirSync(dirname(output), { recursive: true });
	const outputLabel = `${outputRoot.replace(ROOT, "").replaceAll("\\", "/").replace(/^\//, "")}/${notebooksPath}/${notebook.output}`;

	if (isNotebookExportFresh(output, source)) {
		console.log(`skip notebook: ${notebook.source} -> ${outputLabel} (sem mudanças)`);
		continue;
	}

	const prepared = prepareNotebookSourceForExport(source);
	console.log(`export notebook: ${notebook.source} -> ${outputLabel}`);

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
				"--force",
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
		writePresentationLiteFallback();
		injectPresentationMobileFallback(output);
		injectPresentationFullscreen(output);
	}
	if (shouldInjectThemeSelector) {
		injectThemeSelector(output);
	}
}

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = process.cwd();
const errors = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function gitLsFiles(args = []) {
  return execFileSync("git", ["ls-files", ...args], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function listFiles(relativeDir) {
  const start = path.join(root, relativeDir);
  if (!fs.existsSync(start)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(relativePath));
    } else {
      files.push(relativePath.replace(/\\/g, "/"));
    }
  }
  return files;
}

function requireCondition(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const pkg = readJson("package.json");
const templatePkg = readJson("package.template.json");
const templateLock = read("pnpm-lock.template.yaml");
const initializeWorkflow = read(".github/workflows/initialize.yml");
const gitignore = read(".gitignore");
const notebooksDevScript = read("scripts/notebooks_dev.mjs");
const notebooksCheckScript = read("scripts/notebooks_check.mjs");
const notebooksExportScript = read("scripts/export_notebooks.mjs");
const notebooksSlidesScript = read("scripts/export_notebook_slides.mjs");
const presentationNotebook = read("99 - Meta e Anexos/Notebooks/apresentacao-vault-seed.py");
const etlNotebook = read("99 - Meta e Anexos/Notebooks/etl-demo.py");
const labDatasetsManifest = readJson(".site/lab.datasets.json");
const labNotebooksManifest = readJson(".site/lab.notebooks.json");
const labDatasetsScript = read("scripts/prepare_lab_datasets.mjs");
const labEtlDemoScript = read("scripts/lab_etl_demo.mjs");
const headerComponent = read(".site/components/Header.astro");
const astroConfig = read("astro.config.mjs");
const pyproject = read("pyproject.toml");
const marimoCss = read(".site/styles/marimo-vault.css");
const themeRuntimeCss = read(".site/styles/theme-runtime.css");
const vaultLoader = read(".site/content.config.ts");
const customCss = read(".site/styles/custom.css");

requireCondition(
  typeof pkg.packageManager === "string" &&
    pkg.packageManager.startsWith("pnpm@"),
  "package.json must declare pnpm in packageManager.",
);
requireCondition(exists("pnpm-lock.yaml"), "pnpm-lock.yaml must exist.");
requireCondition(
  !exists("package-lock.json"),
  "package-lock.json must not exist.",
);
requireCondition(
  !("standard-version" in (templatePkg.devDependencies || {})),
  "package.template.json must not ship release-only standard-version to generated vaults.",
);
requireCondition(
  !Object.values(templatePkg.scripts || {}).some((script) =>
    /\bstandard-version\b|CHANGELOG\.md|VERSION/.test(script),
  ),
  "package.template.json scripts must not reference release-only changelog or version tooling.",
);
requireCondition(
  templatePkg.scripts?.["notebooks:data"] === "node scripts/generate_vault_data.mjs" &&
    templatePkg.scripts?.["notebooks:etl:demo"] === "node scripts/lab_etl_demo.mjs" &&
    templatePkg.scripts?.["notebooks:etl"] === "pnpm run notebooks:etl:demo && node scripts/prepare_lab_datasets.mjs" &&
    templatePkg.scripts?.["notebooks:dev"] === "node scripts/notebooks_dev.mjs" &&
    templatePkg.scripts?.["notebooks:check"] === "node scripts/notebooks_check.mjs" &&
    templatePkg.scripts?.["notebooks:pair"] === "node scripts/notebooks_pair.mjs" &&
    templatePkg.scripts?.["notebooks:export"] === "node scripts/export_notebooks.mjs",
  "package.template.json must expose notebooks:dev for generated vaults.",
);
requireCondition(
  exists(".site/lab.datasets.json") &&
    notebooksDevScript.includes("buildLabDatasets") &&
    notebooksCheckScript.includes("buildLabDatasets") &&
    notebooksExportScript.includes("buildLabDatasets") &&
    notebooksSlidesScript.includes("buildLabDatasets") &&
    labDatasetsScript.includes('"assets", DATASET_ROOT') &&
    labDatasetsScript.includes("sha256"),
  "Lab ETL tooling must prepare deterministic local/runtime dataset manifests for dev, check, and export.",
);
requireCondition(
  templatePkg.scripts?.["notebooks:export:public"] === "node scripts/export_notebooks.mjs --public" &&
    templatePkg.scripts?.["notebooks:export:slides"] === "node scripts/export_notebook_slides.mjs" &&
    templatePkg.scripts?.["site:dev:lab"] === "pnpm run notebooks:export:public && astro dev" &&
    templatePkg.scripts?.["site:responsive"] === "pnpm run site:build && pnpm run notebooks:export && node scripts/smoke_responsive.mjs" &&
    templatePkg.devDependencies?.["@playwright/test"] === "^1.60.0" &&
    exists("scripts/smoke_responsive.mjs"),
  "package.template.json must expose a local published-Lab preview path for generated vaults.",
);
requireCondition(
  notebooksExportScript.includes("copyVaultDataForWasm") &&
    notebooksExportScript.includes('"assets", "vault-data.json"') &&
    notebooksExportScript.includes("writeVaultData"),
  "notebooks:export must copy vault-data.json to both notebook root and assets/ for WASM runtime fetches.",
);
requireCondition(
  templatePkg.dependencies?.["@dgk/astro-plugins"] === "workspace:^",
  "Generated vaults must use the local workspace @dgk/astro-plugins package until it is published.",
);
requireCondition(
  gitignore.includes("__marimo__/"),
  ".gitignore must ignore Marimo local state directories.",
);
requireCondition(
  notebooksDevScript.includes('"--watch"') || notebooksDevScript.includes("'--watch'"),
  "notebooks:dev must start marimo with --watch so external editor and agent changes reload locally.",
);
requireCondition(
  notebooksDevScript.includes('"--yes"') || notebooksDevScript.includes("'-y'"),
  "notebooks:dev must run marimo with --yes so Ctrl+C exits cleanly through wrapper terminals.",
);
requireCondition(
  notebooksDevScript.includes('"--no-project"') &&
    notebooksCheckScript.includes('"--no-project"'),
  "Notebook uv commands must use --no-project so pyproject.toml config does not trigger Python project resolution.",
);
requireCondition(
  /\[tool\.marimo\.display\]\s+locale = "pt-BR"/m.test(pyproject),
  "pyproject.toml must configure Marimo display locale as pt-BR.",
);
requireCondition(
  !/\[tool\.marimo\.display\][\s\S]*?^\s*theme\s*=/m.test(pyproject),
  "pyproject.toml must not force a Marimo theme; notebooks:dev should respect the user's Marimo light/dark setting.",
);
requireCondition(
  /custom_css = \["\.site\/styles\/marimo-vault\.css"\]/.test(pyproject) &&
    marimoCss.includes("--primary: #1b5e3b") &&
    marimoCss.includes("--primary: #95d5b2"),
  "Marimo must load the vault CSS palette for light and dark notebook themes.",
);
requireCondition(
  marimoCss.includes('color-scheme: dark') &&
    marimoCss.includes("--color-background: var(--background)") &&
    marimoCss.includes("--gdg-bg-cell: var(--background)") &&
    marimoCss.includes('[role="combobox"]') &&
    marimoCss.includes("marimo-table tr:nth-child(even)") &&
    marimoCss.includes('[role="option"][aria-selected="true"]') &&
    marimoCss.includes('.text-muted-foreground'),
  "Marimo exported notebooks must harden table, data-grid, and select colors for accessible dark/light themes.",
);
requireCondition(
  presentationNotebook.includes('app = marimo.App(\n    width="medium",\n    layout_file="layouts/apresentacao-vault-seed.slides.json",\n)') &&
    exists("99 - Meta e Anexos/Notebooks/layouts/apresentacao-vault-seed.slides.json") &&
    !presentationNotebook.includes("mo.carousel") &&
    !presentationNotebook.includes("def slide(source):") &&
    notebooksExportScript.includes("cpSync(sourceLayoutsDir") &&
    marimoCss.includes("overflow-x: hidden") &&
    marimoCss.includes("-webkit-overflow-scrolling: touch") &&
    marimoCss.includes("data-vault-marimo-presentation"),
  "Marimo presentation notebook must use the native slides layout and export its layout file with the notebook source.",
);
requireCondition(
  notebooksExportScript.includes("VAULT_MARIMO_THEME_SELECTOR") &&
    notebooksExportScript.includes("aretw0/vault-seed") &&
    notebooksExportScript.includes("data-vault-marimo-theme-selector") &&
    notebooksExportScript.includes("data-vault-marimo-palette-option") &&
    notebooksExportScript.includes("syncMarimoConfig(resolved)") &&
    notebooksExportScript.includes("window.location.reload()") &&
    !notebooksExportScript.includes('document.addEventListener("DOMContentLoaded", init') &&
    marimoCss.includes(".vault-marimo-theme-selector"),
  "Marimo palette selector must be gated to vault-seed demo exports and apply theme before the WASM app boots.",
);
requireCondition(
  notebooksExportScript.includes("data-vault-marimo-navigation") &&
    notebooksExportScript.includes('href="${labIndexHref}"') &&
    notebooksExportScript.includes("data-vault-marimo-presentation-fullscreen") &&
    notebooksExportScript.includes("vaultMarimoFullscreenButton") &&
    notebooksExportScript.includes("Fechar tela cheia") &&
    notebooksSlidesScript.includes("data-vault-marimo-navigation") &&
    notebooksSlidesScript.includes("data-vault-marimo-presentation-fullscreen") &&
    notebooksSlidesScript.includes("vaultMarimoFullscreenButton") &&
    notebooksSlidesScript.includes("Fechar tela cheia") &&
    !notebooksExportScript.includes("data-vault-marimo-presentation-exit") &&
    marimoCss.includes(".vault-marimo-navigation"),
  "Marimo exported notebooks must include stable navigation and fullscreen labeling for presentations.",
);
requireCondition(
  pkg.scripts?.["notebooks:etl:demo"] === "node scripts/lab_etl_demo.mjs" &&
    pkg.scripts?.["notebooks:etl"]?.includes("notebooks:etl:demo") &&
    labEtlDemoScript.includes("dados\", \"lab\", \"perfil-do-vault.json") &&
    labDatasetsManifest.some((entry) => entry.id === "perfil-do-vault" && entry.source === "dados/lab/perfil-do-vault.json") &&
    labDatasetsManifest.some((entry) => entry.id === "json-remoto-opcional" && entry.runtimeUrl) &&
    labNotebooksManifest.some((entry) => entry.source === "99 - Meta e Anexos/Notebooks/etl-demo.py" && entry.publish === true) &&
    etlNotebook.includes("load_lab_manifest") &&
    etlNotebook.includes("read_lab_json") &&
    etlNotebook.includes("Carregar exemplo remoto no navegador"),
  "Lab ETL demo must keep local snapshot generation, dataset manifest packaging, and a published notebook example wired together.",
);
requireCondition(
  astroConfig.includes("process.env.VAULT_THEME_SELECTOR ??=") &&
  headerComponent.includes("VAULT_THEME_SELECTOR") &&
    headerComponent.includes("GITHUB_REPOSITORY") &&
    headerComponent.includes("aretw0/vault-seed") &&
    headerComponent.includes("data-vault-palette-select") &&
    themeRuntimeCss.includes("data-vault-palette='oceano'") &&
    themeRuntimeCss.includes("data-vault-palette='terracota'"),
  "Astro palette selector must be gated to vault-seed demo builds, while keeping themes available.",
);
requireCondition(
  vaultLoader.includes("renderMetaBadges(safeData)") &&
    customCss.includes(".vault-meta-badges") &&
    customCss.includes(".vault-badge--tag"),
  "Published notes must render frontmatter tag/property badges.",
);
requireCondition(
  (() => {
    const match = initializeWorkflow.match(/files_to_remove:\s*"([^"]+)"/);
    const removed = match ? match[1].split(/\s+/) : [];
    return !removed.includes("packages") &&
      !removed.includes("pnpm-workspace.yaml") &&
      removed.includes("packages/cli");
  })(),
  "initialize.yml must keep pnpm-workspace.yaml and packages/astro-plugins, removing only packages/cli.",
);
for (const [name, specifier] of Object.entries({
  ...(templatePkg.dependencies || {}),
  ...(templatePkg.devDependencies || {}),
})) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedSpecifier = String(specifier).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  requireCondition(
    new RegExp(`\\n      '?${escapedName}'?:\\n        specifier: ${escapedSpecifier}\\n`).test(templateLock),
    `pnpm-lock.template.yaml root importer must include ${name}@${specifier}.`,
  );
}
requireCondition(
  !/standard-version:/.test(templateLock),
  "pnpm-lock.template.yaml must not retain removed standard-version dependency.",
);
requireCondition(
  /packages\/astro-plugins:/.test(templateLock) && !/\n  packages\/cli:/.test(templateLock),
  "pnpm-lock.template.yaml must model the generated vault workspace: packages/astro-plugins only.",
);

const trackedPluginFiles = gitLsFiles([".obsidian/plugins"]);
requireCondition(
  trackedPluginFiles.length === 0,
  `.obsidian/plugins must not be tracked. Found: ${trackedPluginFiles.join(", ")}`,
);

requireCondition(
  exists(".obsidian/community-plugins.json"),
  ".obsidian/community-plugins.json must exist to document the initial community plugin list.",
);
if (exists(".obsidian/community-plugins.json")) {
  requireCondition(
    Array.isArray(readJson(".obsidian/community-plugins.json")),
    ".obsidian/community-plugins.json must be a JSON array.",
  );
}

const trackedSensitiveObsidianFiles = gitLsFiles([
  ".obsidian/graph.json",
  ".obsidian/workspace.json",
  ".obsidian/workspaces.json",
  ".obsidian/workspace-mobile.json",
  ".obsidian/user.json",
]);
requireCondition(
  trackedSensitiveObsidianFiles.length === 0,
  `User-specific Obsidian state must not be tracked. Found: ${trackedSensitiveObsidianFiles.join(", ")}`,
);

const claude = read("CLAUDE.md");
requireCondition(
  claude.split(/\r?\n/).some((line) => line.trim() === "@AGENTS.md"),
  "CLAUDE.md must import AGENTS.md.",
);

const geminiStat = fs.lstatSync(path.join(root, "GEMINI.md"));
if (geminiStat.isSymbolicLink()) {
  requireCondition(
    fs.readlinkSync(path.join(root, "GEMINI.md")).replace(/\\/g, "/") ===
      "AGENTS.md",
    "GEMINI.md symlink must point to AGENTS.md.",
  );
} else {
  const geminiContent = read("GEMINI.md");
  requireCondition(
    geminiContent.trim() === "AGENTS.md" || geminiContent === read("AGENTS.md"),
    "GEMINI.md must point to or stay equivalent to AGENTS.md when symlinks are unavailable.",
  );
}

const workflowFiles = listFiles(".github/workflows").filter((file) =>
  file.endsWith(".yml"),
);
const actionFiles = workflowFiles.concat(
  listFiles(".github/actions").filter(
    (file) => file.endsWith(".yml") || file.endsWith(".yaml"),
  ),
);

const usesPattern = /^\s*uses:\s+([^\s#]+)/gm;
const shaPinnedActionPattern = /^[^@\s]+@[0-9a-f]{40}$/;

for (const workflowFile of workflowFiles) {
  const content = read(workflowFile);
  requireCondition(
    !content.includes('cache: "npm"') && !/\bnpm ci\b/.test(content),
    `${workflowFile} must use pnpm setup/install, not npm.`,
  );
  requireCondition(
    !/\bnpm run\b/.test(content) && !/\bnpx\s/.test(content),
    `${workflowFile} must call pnpm scripts and pnpm exec, not npm/npx.`,
  );
}

for (const actionFile of actionFiles) {
  const content = read(actionFile);
  for (const match of content.matchAll(usesPattern)) {
    const actionRef = match[1];
    if (actionRef.startsWith("./")) {
      continue;
    }

    requireCondition(
      shaPinnedActionPattern.test(actionRef),
      `${actionFile} must pin external action ${actionRef} to a full commit SHA.`,
    );
  }
}

if (errors.length > 0) {
  console.error("Template smoke failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Template smoke passed.");

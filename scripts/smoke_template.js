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
  templatePkg.scripts?.["notebooks:dev"] ===
    'marimo edit "99 - Meta e Anexos/Notebooks"',
  "package.template.json must expose notebooks:dev for generated vaults.",
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

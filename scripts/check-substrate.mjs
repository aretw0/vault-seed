#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const json = process.argv.includes("--json");
const isWindows = process.platform === "win32";

const checks = [];
const recommendations = [];

function rel(...parts) {
  return path.join(root, ...parts);
}

function bin(name) {
  return isWindows ? `${name}.cmd` : name;
}

async function exists(filePath, mode = constants.F_OK) {
  try {
    await access(filePath, mode);
    return true;
  } catch {
    return false;
  }
}

async function addPathCheck(id, label, filePath, { executable = false, required = true } = {}) {
  const ok = await exists(filePath, executable && !isWindows ? constants.X_OK : constants.F_OK);
  checks.push({ id, label, ok, required, path: path.relative(root, filePath) || "." });
  return ok;
}

async function readDevcontainerNodeModulesTarget() {
  try {
    const config = JSON.parse(await readFile(rel(".devcontainer", "devcontainer.json"), "utf8"));
    const mounts = Array.isArray(config.mounts) ? config.mounts : [];
    for (const mount of mounts) {
      if (typeof mount !== "string") continue;
      const fields = Object.fromEntries(
        mount.split(",").map((field) => {
          const index = field.indexOf("=");
          if (index === -1) return [field.trim(), ""];
          return [field.slice(0, index).trim(), field.slice(index + 1).trim()];
        })
      );
      if (!fields.target || !fields.source?.includes("node-modules")) continue;
      const target = path.resolve(fields.target);
      if (target === path.resolve(rel("node_modules"))) return target;
    }
  } catch {
    return null;
  }
  return null;
}

function decodeMountInfoPath(value) {
  return value.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)));
}

async function readLinuxMountPoints() {
  if (process.platform !== "linux") return [];
  const content = process.env.REFARM_NODE_SUBSTRATE_MOUNTINFO ?? await readFile("/proc/self/mountinfo", "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(" - ")[0]?.split(" ")[4])
    .filter(Boolean)
    .map(decodeMountInfoPath)
    .map((mountPoint) => path.resolve(mountPoint));
}

async function addDevcontainerNodeModulesMountCheck() {
  const target = await readDevcontainerNodeModulesTarget();
  if (!target) return;
  const mountPoints = await readLinuxMountPoints();
  if (mountPoints.length === 0) return;
  checks.push({
    id: "devcontainer_node_modules_mount",
    label: "devcontainer node_modules volume mount",
    ok: mountPoints.includes(target),
    required: true,
    path: "node_modules",
    target
  });
}

function addCommandCheck(id, command, args = ["--version"], { required = true, shell = isWindows } = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell });
  const ok = result.status === 0;
  checks.push({
    id,
    label: `${command} ${args.join(" ")}`,
    ok,
    required,
    command: [command, ...args].join(" "),
    stderr: ok ? undefined : (result.stderr || result.stdout || "").trim().slice(0, 240)
  });
  return ok;
}

function addAnyCommandCheck(id, label, candidates, { required = true } = {}) {
  const attempts = [];
  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, { cwd: root, encoding: "utf8", shell: isWindows });
    attempts.push([candidate.command, ...candidate.args].join(" "));
    if (result.status === 0) {
      checks.push({ id, label, ok: true, required, command: [candidate.command, ...candidate.args].join(" ") });
      return true;
    }
  }
  checks.push({ id, label, ok: false, required, command: attempts.join(" | ") });
  return false;
}

await addPathCheck("node_modules", "workspace dependencies", rel("node_modules"));
await addPathCheck("node_modules_bin", "workspace executable shims", rel("node_modules", ".bin"));
await addDevcontainerNodeModulesMountCheck();
for (const name of ["astro", "playwright", "markdownlint", "prettier", "changeset"]) {
  await addPathCheck(`bin_${name}`, `${name} executable shim`, rel("node_modules", ".bin", bin(name)), { executable: true });
}

await addPathCheck("requirements", "base Python requirements", rel("requirements.txt"));
await addPathCheck("requirements_local_etl", "local ETL Python requirements", rel("requirements.local-etl.txt"));

addCommandCheck("node", "node", ["--version"]);
addCommandCheck("pnpm", "pnpm", ["--version"]);
addCommandCheck("uv", "uv", ["--version"]);
addAnyCommandCheck("python", "Python 3 runtime", [
  { command: "python3", args: ["--version"] },
  { command: "python", args: ["--version"] },
  { command: "py", args: ["-3", "--version"] }
]);

const missing = checks.filter((check) => check.required && !check.ok);

if (missing.some((check) => check.id === "devcontainer_node_modules_mount")) {
  recommendations.push("Rebuild/reopen the devcontainer so node_modules is mounted from its container-owned Docker volume.");
}
if (missing.some((check) => check.id.startsWith("node_modules") || check.id.startsWith("bin_"))) {
  recommendations.push("Run: pnpm install --frozen-lockfile --config.confirm-modules-purge=false");
}
if (missing.some((check) => check.id === "uv" || check.id === "python")) {
  recommendations.push("Install Python 3 and uv, or rebuild/reopen the devcontainer so its features are applied.");
}
if (missing.some((check) => check.id.startsWith("requirements"))) {
  recommendations.push("Restore the requirements files before running notebook extraction or local ETL commands.");
}
if (missing.length > 0) {
  recommendations.push("If this is inside the devcontainer, rebuild/reopen it so the container-owned node_modules volume is used.");
}

const result = {
  ok: missing.length === 0,
  project: "vault-seed",
  command: "substrate:check",
  checks,
  missing: missing.map((check) => check.id),
  mountIssues: missing
    .filter((check) => check.id === "devcontainer_node_modules_mount")
    .map((check) => ({ id: check.id, path: check.path, target: check.target })),
  recommendations,
  nextCommand: missing.length > 0 ? recommendations[0] ?? null : null,
  nextCommands: missing.length > 0 ? recommendations : []
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log("vault-seed substrate ok");
} else {
  console.error("vault-seed substrate drift detected:");
  for (const check of missing) {
    console.error(`- ${check.id}: ${check.path ?? check.command}`);
  }
  for (const recommendation of recommendations) {
    console.error(`next: ${recommendation}`);
  }
}

process.exit(result.ok ? 0 : 1);

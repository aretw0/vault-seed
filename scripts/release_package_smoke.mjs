#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGE_DIR = path.join(ROOT, "packages");
const RELEASE_PACKAGES = [
  "packages/cli",
  "packages/dgk-channels",
  "packages/astro-plugins",
  "packages/dgk-runner",
  "packages/dgk-skills",
];

function readText(relPath) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function listWorkspacePackages() {
  if (!existsSync(PACKAGE_DIR)) return [];
  return readdirSync(PACKAGE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((relPath) => existsSync(path.join(ROOT, relPath, "package.json")))
    .sort();
}

function runPackDryRun(relPath) {
  const npmCache = path.join(ROOT, ".sandbox", "npm-pack-cache");
  mkdirSync(npmCache, { recursive: true });
  const result = spawnSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
    cwd: path.join(ROOT, relPath),
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache,
    },
    shell: process.platform === "win32",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    return {
      ok: false,
      packageDir: relPath,
      error: output || `npm pack exited with ${result.status}`,
    };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return {
      ok: true,
      packageDir: relPath,
      filename: first?.filename,
      files: Array.isArray(first?.files) ? first.files.length : 0,
      unpackedSize: first?.unpackedSize,
    };
  } catch {
    return {
      ok: false,
      packageDir: relPath,
      error: `could not parse npm pack output: ${output}`,
    };
  }
}

export function buildReleasePackageSmokeReport(options = {}) {
  const runPack = options.runPack !== false;
  const rootPackage = readJson("package.json");
  const changesetConfig = readJson(".changeset/config.json");
  const releaseWorkflow = readText(".github/workflows/release.yml");
  const publishWorkflow = readText(".github/workflows/publish-packages.yml");
  const prepareWorkflow = readText(".github/workflows/prepare-release-pr.yml");
  const packageDirs = listWorkspacePackages();

  const blockers = [];
  const warnings = [];

  for (const relPath of RELEASE_PACKAGES) {
    if (!packageDirs.includes(relPath)) blockers.push(`missing release package directory: ${relPath}`);
  }

  if (rootPackage.private !== true) {
    blockers.push("root package must remain private to avoid accidental vault template publish");
  }
  if (changesetConfig.access !== "public") {
    blockers.push(".changeset/config.json must keep access=public for scoped public packages");
  }
  if (changesetConfig.baseBranch !== "main") {
    blockers.push(".changeset/config.json must keep baseBranch=main");
  }

  for (const relPath of RELEASE_PACKAGES) {
    const manifest = readJson(path.join(relPath, "package.json"));
    if (manifest.private === true) blockers.push(`${relPath} must not be private`);
    if (manifest.publishConfig?.access !== "public") blockers.push(`${relPath} must declare publishConfig.access=public`);
    if (!manifest.repository?.directory) blockers.push(`${relPath} must declare repository.directory`);
  }

  if (!/workflow_dispatch:/.test(prepareWorkflow)) {
    blockers.push("prepare-release-pr workflow must remain manual");
  }
  if (!/pnpm changeset version/.test(prepareWorkflow)) {
    blockers.push("prepare-release-pr workflow must version through changesets");
  }
  if (!/scripts\/sync_lockfile_template\.mjs --from-workspace/.test(prepareWorkflow)) {
    blockers.push("prepare-release-pr workflow must sync pnpm-lock.template.yaml from local workspace package tarball integrity");
  }
  if (!/contains\(github\.event\.head_commit\.message, 'chore\(release\):'\)/.test(releaseWorkflow)) {
    blockers.push("release workflow must remain gated by release commit message");
  }
  if (!/scripts\/get_release_notes\.js/.test(releaseWorkflow)) {
    blockers.push("release workflow must extract GitHub release notes from CHANGELOG");
  }
  if (!/softprops\/action-gh-release@[0-9a-f]{40}/.test(releaseWorkflow)) {
    blockers.push("release workflow must keep GitHub Release action pinned to a full SHA");
  }
  if (!/pnpm changeset publish -- --provenance/.test(releaseWorkflow)) {
    blockers.push("release workflow must publish npm packages directly after creating the GitHub Release");
  }
  if (!/id-token:\s*write/.test(releaseWorkflow)) {
    blockers.push("release workflow must grant id-token:write for npm provenance publishing");
  }
  if (!/NODE_AUTH_TOKEN:\s*\$\{\{ secrets\.NPM_TOKEN \}\}/.test(releaseWorkflow)) {
    blockers.push("release workflow must require explicit NPM_TOKEN for npm publishing");
  }
  if (!/pnpm --filter @aretw0\/dgk-astro-plugins build/.test(releaseWorkflow)) {
    blockers.push("release workflow must build @aretw0/dgk-astro-plugins before npm publishing");
  }
  if (!/NODE_AUTH_TOKEN:\s*\$\{\{ secrets\.NPM_TOKEN \}\}/.test(publishWorkflow)) {
    blockers.push("publish-packages workflow must require explicit NPM_TOKEN for manual package publishing");
  }
  if (!/pnpm changeset publish/.test(publishWorkflow)) {
    blockers.push("publish-packages workflow must publish via changesets");
  }
  if (!/pnpm --filter @aretw0\/dgk-astro-plugins build/.test(publishWorkflow)) {
    blockers.push("publish-packages workflow must build @aretw0/dgk-astro-plugins before npm publishing");
  }
  if (/npm\.pkg\.github\.com|packages:\s*write/.test(publishWorkflow)) {
    warnings.push("GitHub Packages publishing is not configured for vault-seed; keep it opt-in and separately gated");
  }

  const packResults = runPack ? RELEASE_PACKAGES.map(runPackDryRun) : [];
  for (const result of packResults) {
    if (!result.ok) blockers.push(`${result.packageDir} pack dry-run failed: ${result.error}`);
    if (result.ok && (!result.files || result.files <= 0)) blockers.push(`${result.packageDir} pack dry-run produced no files`);
  }

  return {
    ok: blockers.length === 0,
    rootVersion: rootPackage.version,
    packageCount: packageDirs.length,
    releasePackages: RELEASE_PACKAGES.map((relPath) => {
      const manifest = readJson(path.join(relPath, "package.json"));
      return { relPath, name: manifest.name, version: manifest.version };
    }),
    packResults,
    githubReleases: {
      releaseCommitGated: /contains\(github\.event\.head_commit\.message, 'chore\(release\):'\)/.test(releaseWorkflow),
      changelogBacked: /scripts\/get_release_notes\.js/.test(releaseWorkflow),
    },
    githubPackages: {
      configured: /npm\.pkg\.github\.com|packages:\s*write/.test(publishWorkflow),
      mode: /npm\.pkg\.github\.com|packages:\s*write/.test(publishWorkflow) ? "configured" : "not-configured",
    },
    blockers,
    warnings,
  };
}

function printReport(report) {
  console.log(`release-package-smoke: ${report.ok ? "OK" : "FAIL"}`);
  console.log(`rootVersion=${report.rootVersion} packageCount=${report.packageCount}`);
  console.log(`githubReleases=release-commit-gated:${report.githubReleases.releaseCommitGated ? "yes" : "no"} changelog:${report.githubReleases.changelogBacked ? "yes" : "no"}`);
  console.log(`githubPackages=${report.githubPackages.mode}`);
  for (const pkg of report.releasePackages) {
    console.log(`package ${pkg.name}@${pkg.version} ${pkg.relPath}`);
  }
  for (const pack of report.packResults) {
    if (pack.ok) console.log(`pack ${pack.packageDir} files=${pack.files} unpackedSize=${pack.unpackedSize} filename=${pack.filename}`);
  }
  for (const warning of report.warnings) console.warn(`warning: ${warning}`);
  for (const blocker of report.blockers) console.error(`blocker: ${blocker}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const json = process.argv.includes("--json");
  const noPack = process.argv.includes("--no-pack");
  const report = buildReleasePackageSmokeReport({ runPack: !noPack });
  if (json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  process.exit(report.ok ? 0 : 1);
}

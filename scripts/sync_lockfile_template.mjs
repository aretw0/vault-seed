#!/usr/bin/env node
/**
 * Syncs pnpm-lock.template.yaml with DGK package versions.
 *
 * Run after publishing new versions to npm:
 *   node scripts/sync_lockfile_template.mjs
 *   node scripts/sync_lockfile_template.mjs --check   (fails if out of date)
 *
 * Run inside a release PR, after `pnpm changeset version` and before publish:
 *   node scripts/sync_lockfile_template.mjs --from-workspace
 *
 * The template lock file is used by initialize.yml to seed user vault lock files.
 * An out-of-date entry causes pnpm install --frozen-lockfile to fail in user vault CI.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEMPLATE = join(ROOT, "pnpm-lock.template.yaml");
const CHECK_MODE = process.argv.includes("--check");
const FROM_WORKSPACE = process.argv.includes("--from-workspace");

const MANAGED_PACKAGES = ["@aretw0/dgk-cli", "@aretw0/dgk-channels"];
const WORKSPACE_PACKAGE_DIRS = {
  "@aretw0/dgk-cli": "packages/cli",
  "@aretw0/dgk-channels": "packages/dgk-channels",
};

function npmView(pkg, field) {
  return execFileSync("npm", ["view", pkg, field], { encoding: "utf8" }).trim();
}

function workspacePackageMeta(pkg) {
  const packageDir = WORKSPACE_PACKAGE_DIRS[pkg];
  if (!packageDir) throw new Error(`No workspace package directory configured for ${pkg}`);

  const manifest = JSON.parse(readFileSync(join(ROOT, packageDir, "package.json"), "utf8"));
  const npmCache = join(ROOT, ".sandbox", "npm-pack-cache");
  const output = execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
    cwd: join(ROOT, packageDir),
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache,
    },
  });
  const parsed = JSON.parse(output);
  const packed = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!packed?.integrity) {
    throw new Error(`npm pack did not return integrity for ${pkg}`);
  }
  return { version: manifest.version, integrity: packed.integrity };
}

/**
 * Returns true when the lockfile content already has the expected version and integrity
 * for the given package.
 */
export function isUpToDate(content, pkg, version, integrity) {
  return content.includes(`${pkg}@${version}`) && content.includes(integrity);
}

/**
 * Applies version and integrity updates to lockfile content string for the given package.
 * Handles three occurrences: importer version ref, packages key, snapshots key, and integrity hash.
 */
export function applyUpdates(content, pkg, version, integrity) {
  const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let result = content;

  // Importer devDependencies version reference
  result = result.replace(
    new RegExp(`(devDependencies:[\\s\\S]*?'${escapedPkg}':[\\s\\S]*?version: )\\S+`, "m"),
    `$1${version}`,
  );

  // Packages entry key: '@scope/pkg@X.Y.Z':
  result = result.replace(
    new RegExp(`'${escapedPkg}@[^']+'`, "g"),
    `'${pkg}@${version}'`,
  );

  // Snapshots entry key: '@scope/pkg@X.Y.Z': {}
  result = result.replace(
    new RegExp(`('${escapedPkg}@)[^']+(':\\s*\\{\\})`, "g"),
    `$1${version}$2`,
  );

  // Integrity hash — replace the hash belonging to this package
  // The packages section entry for this package appears just before its integrity line.
  result = result.replace(
    new RegExp(`('${escapedPkg}@[^']+':.*?\\{integrity: )sha512-[A-Za-z0-9+/=]+(\\})`, "s"),
    `$1${integrity}$2`,
  );

  return result;
}

const isMain = process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  let content = readFileSync(TEMPLATE, "utf8");
  let allUpToDate = true;

  for (const pkg of MANAGED_PACKAGES) {
    let version, integrity;
    try {
      if (FROM_WORKSPACE) {
        ({ version, integrity } = workspacePackageMeta(pkg));
      } else {
        version = npmView(pkg, "version");
        integrity = npmView(pkg, "dist.integrity");
      }
    } catch {
      console.warn(`⚠ ${pkg} não encontrado — ignorando.`);
      continue;
    }

    console.log(`${pkg} ${FROM_WORKSPACE ? "workspace" : "latest"}: ${version}`);
    console.log(`integrity: ${integrity}`);

    if (!isUpToDate(content, pkg, version, integrity)) {
      allUpToDate = false;
      if (!CHECK_MODE) {
        content = applyUpdates(content, pkg, version, integrity);
        console.log(`✓ ${pkg} atualizado para ${version}`);
      }
    } else {
      console.log(`✓ ${pkg} já está na versão ${version}`);
    }
  }

  if (CHECK_MODE) {
    if (!allUpToDate) {
      console.error(`\n✗ pnpm-lock.template.yaml está desatualizado.`);
      console.error(`  Execute: node scripts/sync_lockfile_template.mjs`);
      process.exit(1);
    }
    console.log("\n✓ pnpm-lock.template.yaml está atualizado.");
    process.exit(0);
  }

  writeFileSync(TEMPLATE, content, "utf8");
  console.log(`\n✓ pnpm-lock.template.yaml sincronizado.`);
}

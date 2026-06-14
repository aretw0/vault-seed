#!/usr/bin/env node
/**
 * Syncs pnpm-lock.template.yaml with the latest published DGK packages.
 *
 * Run after publishing new versions to npm:
 *   node scripts/sync_lockfile_template.mjs
 *   node scripts/sync_lockfile_template.mjs --check   (fails if out of date)
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

const MANAGED_PACKAGES = ["@aretw0/dgk-cli", "@aretw0/dgk-channels"];

function npmView(pkg, field) {
  return execFileSync("npm", ["view", pkg, field], { encoding: "utf8" }).trim();
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
      version = npmView(pkg, "version");
      integrity = npmView(pkg, "dist.integrity");
    } catch {
      console.warn(`⚠ ${pkg} não publicado ainda — ignorando.`);
      continue;
    }

    console.log(`${pkg} latest: ${version}`);
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

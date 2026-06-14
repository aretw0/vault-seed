import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), "utf8"));
}

function packageJsonPaths() {
  const paths = [join(ROOT, "package.json")];
  const pkgsDir = join(ROOT, "packages");
  if (!existsSync(pkgsDir)) return paths;
  for (const entry of readdirSync(pkgsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = join(pkgsDir, entry.name, "package.json");
    if (existsSync(p)) paths.push(p);
  }
  return paths;
}

const STABLE_SEMVER = /^\d+\.\d+\.\d+$/;

test("all package.json files declare a stable semver version (no pre-release suffix)", () => {
  for (const absPath of packageJsonPaths()) {
    const pkg = JSON.parse(readFileSync(absPath, "utf8"));
    if (!pkg.version) continue; // private monorepo roots without version are fine
    assert.match(
      pkg.version,
      STABLE_SEMVER,
      `${pkg.name ?? absPath} version "${pkg.version}" is not a stable x.y.z semver. ` +
        "Pre-release suffixes (-dev.0, -alpha.1, etc.) must not be committed — " +
        "set the version to the last stable release and let changesets compute the next one."
    );
  }
});

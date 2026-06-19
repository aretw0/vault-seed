import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function readJson(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), "utf8"));
}

function gitTags() {
  try {
    return execFileSync("git", ["tag", "-l"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function semverParts(version) {
  return version
    .replace(/-.*/, "")
    .split(".")
    .map(Number);
}

function semverGte(a, b) {
  const [am, an, ap] = semverParts(a);
  const [bm, bn, bp] = semverParts(b);
  if (am !== bm) return am > bm;
  if (an !== bn) return an > bn;
  return ap >= bp;
}

function semverBump(version, type) {
  const base = version.replace(/-.*/, "");
  if (base !== version) return base; // releasing a pre-release gives the stable base
  const [major, minor, patch] = base.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function latestReleaseTag(tags) {
  return tags
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => {
      const [am, an, ap] = semverParts(a);
      const [bm, bn, bp] = semverParts(b);
      return am !== bm ? am - bm : an !== bn ? an - bn : ap - bp;
    })
    .pop();
}

function pendingChangesets() {
  const dir = join(ROOT, ".changeset");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .flatMap((f) => {
      const content = readFileSync(join(dir, f), "utf8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return [];
      return match[1]
        .split("\n")
        .map((line) => line.match(/^"([^"]+)":\s*(patch|minor|major)$/))
        .filter(Boolean)
        .map((m) => ({ name: m[1], bump: m[2], file: f }));
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test("root package.json version must not be behind the latest release tag", () => {
  const root = readJson("package.json");
  const latest = latestReleaseTag(gitTags());
  if (!latest) return; // no tags yet — fresh repo, nothing to check

  const latestVersion = latest.replace("v", "");
  assert.ok(
    semverGte(root.version, latestVersion),
    `root package.json version ${root.version} is behind the latest release tag ${latest}. ` +
      "This happens when a merge conflict is resolved with --ours and the version bump from " +
      "main is discarded. Fix: update package.json to at least " + latestVersion + "."
  );
});

test("no workspace package.json has a pre-release version suffix", () => {
  const pkgsDir = join(ROOT, "packages");
  if (!existsSync(pkgsDir)) return;
  for (const entry of readdirSync(pkgsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(pkgsDir, entry.name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.version) continue;
    assert.ok(
      !/-./.test(pkg.version),
      `${pkg.name}@${pkg.version} has a pre-release suffix in packages/${entry.name}/package.json. ` +
        "Commit only stable versions — set the version to the last stable release " +
        "and let changesets compute the next one."
    );
  }
});

test("no pending changeset would produce a version that already exists as a git tag", () => {
  const root = readJson("package.json");
  const tags = gitTags();
  const changesets = pendingChangesets();

  // Find the highest bump type for the root package across all changesets.
  const RANK = { patch: 1, minor: 2, major: 3 };
  let highestBump = null;
  for (const { name, bump } of changesets) {
    if (name !== root.name) continue;
    if (!highestBump || RANK[bump] > RANK[highestBump]) highestBump = bump;
  }
  if (!highestBump) return; // no changeset targets the root package

  const nextVersion = semverBump(root.version, highestBump);
  const nextTag = `v${nextVersion}`;

  assert.ok(
    !tags.includes(nextTag),
    `a pending changeset would bump ${root.name} to ${nextVersion}, but tag ${nextTag} already exists. ` +
      "The changeset is stale — it was already applied in a previous release and should be deleted."
  );
});

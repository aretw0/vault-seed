import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

test("markdownlint config uses opt-in (default: false) to prevent surprise rule activations on upgrades", () => {
  const rootLint = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".markdownlint.json"), "utf8"));

  // default: false means only explicitly listed rules are active.
  // Changing to true would silently activate new rules on markdownlint-cli upgrades,
  // breaking user CI without them having changed anything.
  expect(rootLint.default, "Root .markdownlint.json must use 'default: false' (opt-in). See docs/guia-de-lint.md.").toBe(false);

  // Every active rule must be listed explicitly (either true or an object with options).
  const activeRules = Object.entries(rootLint)
    .filter(([k, v]) => k !== "default" && v !== false)
    .map(([k]) => k);

  expect(activeRules.length > 0, "At least one rule must be explicitly enabled in .markdownlint.json.").toBeTruthy();
  expect(activeRules.length <= 15, `Too many active rules (${activeRules.length}). Prefer a focused set; see docs/guia-de-lint.md.`).toBeTruthy();
});

test("root package.json version is aligned with the published release baseline", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const version = pkg.version;

  // 0.0.1 is the stale development placeholder from before changesets were wired up.
  // After the first changeset version run the version must reflect the actual published state.
  expect(version, `package.json version is '0.0.1' — run 'pnpm changeset version' or restore the last published version.`).not.toBe("0.0.1");

  // Must be a valid semver (major.minor.patch) so the release workflow can tag correctly.
  expect(version, `package.json version '${version}' is not a valid semver major.minor.patch string.`).toMatch(/^\d+\.\d+\.\d+$/);
});

test("release package smoke keeps release and package publishing explicitly gated", async () => {
  const { buildReleasePackageSmokeReport } = await import("./release_package_smoke.mjs");
  const report = buildReleasePackageSmokeReport({ runPack: false });

  expect(report.ok, report.blockers.join("\n")).toBe(true);
  expect(report.githubReleases.releaseCommitGated).toBe(true);
  expect(report.githubReleases.changelogBacked).toBe(true);
  expect(report.githubPackages.configured).toBe(false);
  expect(report.githubPackages.mode).toBe("not-configured");
  expect(fs.readFileSync(path.join(process.cwd(), "packages/cli/src/index.js"), "utf8").includes("release"), "@aretw0/dgk-cli must not expose a release command until a supported release flow exists for generated vaults.").toBe(false);
  expect(report.releasePackages.map((pkg) => pkg.name)).toEqual([
      "@aretw0/dgk-channels",
      "@aretw0/dgk-astro-plugins",
      "@aretw0/dgk-skills",
    ]);
  expect(report.pythonReleasePackages.map((pkg) => pkg.name)).toEqual(["dgk-lab-runtime"]);
  expect(report.pypiRelease.tagGated).toBe(true);
  expect(report.pypiRelease.trustedPublishing).toBe(true);
}, 15000);

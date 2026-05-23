const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("release package smoke keeps release and package publishing explicitly gated", async () => {
  const { buildReleasePackageSmokeReport } = await import("./release_package_smoke.mjs");
  const report = buildReleasePackageSmokeReport({ runPack: false });

  assert.equal(report.ok, true, report.blockers.join("\n"));
  assert.equal(report.githubReleases.releaseCommitGated, true);
  assert.equal(report.githubReleases.changelogBacked, true);
  assert.equal(report.githubPackages.configured, false);
  assert.equal(report.githubPackages.mode, "not-configured");
  assert.equal(
    fs.readFileSync(path.join(process.cwd(), "packages/cli/src/index.js"), "utf8").includes("release"),
    false,
    "@dgk/cli must not expose a release command until a supported release flow exists for generated vaults.",
  );
  assert.deepEqual(
    report.releasePackages.map((pkg) => pkg.name),
    ["@dgk/cli", "@dgk/astro-plugins"],
  );
});

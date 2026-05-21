const test = require("node:test");
const assert = require("node:assert/strict");

test("release package smoke keeps release and package publishing explicitly gated", async () => {
  const { buildReleasePackageSmokeReport } = await import("./release_package_smoke.mjs");
  const report = buildReleasePackageSmokeReport({ runPack: false });

  assert.equal(report.ok, true, report.blockers.join("\n"));
  assert.equal(report.githubReleases.releaseCommitGated, true);
  assert.equal(report.githubReleases.changelogBacked, true);
  assert.equal(report.githubPackages.configured, false);
  assert.equal(report.githubPackages.mode, "not-configured");
  assert.deepEqual(
    report.releasePackages.map((pkg) => pkg.name),
    ["@dgk/cli", "@dgk/astro-plugins"],
  );
});

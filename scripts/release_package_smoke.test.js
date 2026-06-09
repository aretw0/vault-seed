const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("root package.json version is aligned with the published release baseline", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const version = pkg.version;

  // 0.0.1 is the stale development placeholder from before changesets were wired up.
  // After the first changeset version run the version must reflect the actual published state.
  assert.notEqual(
    version,
    "0.0.1",
    `package.json version is '0.0.1' — run 'pnpm changeset version' or restore the last published version.`,
  );

  // Must be a valid semver (major.minor.patch) so the release workflow can tag correctly.
  assert.match(
    version,
    /^\d+\.\d+\.\d+$/,
    `package.json version '${version}' is not a valid semver major.minor.patch string.`,
  );
});

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
    "@aretw0/dgk-cli must not expose a release command until a supported release flow exists for generated vaults.",
  );
  assert.deepEqual(
    report.releasePackages.map((pkg) => pkg.name),
    ["@aretw0/dgk-cli", "@aretw0/dgk-astro-plugins"],
  );
});

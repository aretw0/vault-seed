import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const SPEC = "file:../../vendor/refarm.dev-launch-process-0.1.0.tgz";

test("dgk-runner and dgk-cli pin @refarm.dev/launch-process via the local tarball", () => {
  assert.equal(
    readJson("packages/dgk-runner/package.json").dependencies?.["@refarm.dev/launch-process"],
    SPEC,
  );
  assert.equal(
    readJson("packages/cli/package.json").dependencies?.["@refarm.dev/launch-process"],
    SPEC,
  );
});

test("the consumed @refarm.dev/launch-process surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "packages/dgk-runner/node_modules/@refarm.dev/launch-process/dist/index.d.ts"),
    "utf8",
  );
  for (const name of [
    "createLaunchProcessRunner",
    "createLaunchProcessSpecFromRunner",
    "runLaunchProcess",
    "runLaunchProcessSync",
    "launchDetachedProcess",
  ]) {
    assert.match(dts, new RegExp(`export declare function ${name}\\b`), `missing ${name}`);
  }
});

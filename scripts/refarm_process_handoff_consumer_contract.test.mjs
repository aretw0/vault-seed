import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const SPEC = "file:../../vendor/refarm.dev-process-handoff-0.1.0.tgz";

test("dgk-runner and dgk-cli pin @refarm.dev/process-handoff via the local tarball", () => {
  assert.equal(
    readJson("packages/dgk-runner/package.json").dependencies?.["@refarm.dev/process-handoff"],
    SPEC,
  );
  assert.equal(
    readJson("packages/cli/package.json").dependencies?.["@refarm.dev/process-handoff"],
    SPEC,
  );
});

test("the consumed @refarm.dev/process-handoff surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "packages/dgk-runner/node_modules/@refarm.dev/process-handoff/dist/index.d.ts"),
    "utf8",
  );
  for (const name of [
    "createProcessHandoffRunner",
    "createProcessHandoffSpecFromRunner",
    "runProcessHandoff",
    "runProcessHandoffSync",
    "startDetachedProcessHandoff",
    "executeProcessHandoff",
    "createProcessHandoffSpec",
    "createProcessHandoffDisplay",
    "splitProcessHandoffCommand",
    "quoteProcessHandoffArg",
  ]) {
    assert.match(dts, new RegExp(`export declare function ${name}\\b`), `missing ${name}`);
  }
});

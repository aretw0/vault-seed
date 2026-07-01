import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const SPEC = "file:../../vendor/refarm.dev-process-handoff-0.1.0.tgz";

test("dgk-runner and dgk-cli pin @refarm.dev/process-handoff via the local tarball", () => {
  expect(readJson("packages/dgk-runner/package.json").dependencies?.["@refarm.dev/process-handoff"]).toBe(SPEC);
  expect(readJson("packages/cli/package.json").dependencies?.["@refarm.dev/process-handoff"]).toBe(SPEC);
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
    expect(dts, `missing ${name}`).toMatch(new RegExp(`export declare function ${name}\\b`));
  }
});

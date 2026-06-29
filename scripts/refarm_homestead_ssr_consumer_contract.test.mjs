import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("dgk-cli pins @refarm.dev/homestead-ssr via the local tarball", () => {
  const pkg = readJson("packages/cli/package.json");
  assert.equal(
    pkg.dependencies?.["@refarm.dev/homestead-ssr"],
    "file:../../vendor/refarm.dev-homestead-ssr-0.1.0.tgz",
  );
});

// pnpm 11 reads overrides from pnpm-workspace.yaml, not package.json.
test("pnpm-workspace.yaml overrides the transitive @refarm.dev/ds to the local tarball", () => {
  const yaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  assert.match(yaml, /@refarm\.dev\/ds.*file:vendor\/refarm\.dev-ds-0\.1\.0\.tgz/);
});

test("the consumed homestead-ssr surface is exported", () => {
  const renderDts = readFileSync(
    join(ROOT, "packages/cli/node_modules/@refarm.dev/homestead-ssr/dist/render.d.ts"),
    "utf8",
  );
  const shellDts = readFileSync(
    join(ROOT, "packages/cli/node_modules/@refarm.dev/homestead-ssr/dist/shell.d.ts"),
    "utf8",
  );
  for (const name of ["cardHtml", "tableHtml", "sectionHtml", "gridHtml", "buttonHtml", "fieldHtml", "escapeHtml"]) {
    assert.match(renderDts, new RegExp(`export declare function ${name}\\b`), `missing ${name}`);
  }
  assert.match(shellDts, /export declare function shellHtml\b/);
});

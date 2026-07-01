import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// The dgk admin (serve.js + admin_views.mjs) consumes the build-free DS HTML
// helpers at the `@refarm.dev/ds/html` subpath (ADR-072: DS-owned, isomorphic;
// replaces the removed @refarm.dev/homestead-ssr). The page document helper was
// renamed shellHtml -> documentHtml.
test("dgk-cli pins @refarm.dev/ds via the local tarball", () => {
  const pkg = readJson("packages/cli/package.json");
  expect(pkg.dependencies?.["@refarm.dev/ds"]).toBe("file:../../vendor/refarm.dev-ds-0.1.0.tgz");
});

test("the consumed @refarm.dev/ds/html surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "packages/cli/node_modules/@refarm.dev/ds/dist/html.d.ts"),
    "utf8",
  );
  for (const name of [
    "documentHtml",
    "cardHtml",
    "tableHtml",
    "sectionHtml",
    "gridHtml",
    "buttonHtml",
    "fieldHtml",
    "escapeHtml",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`export declare function ${name}\\b`));
  }
});

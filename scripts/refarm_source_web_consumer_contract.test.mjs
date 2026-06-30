import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// vault-seed consumes @refarm.dev/source-web — a source:v1 adapter that materializes a
// sanitized fixture web snapshot (session/pacing/cache/redaction provenance) for the
// records ETL acquisition seam. Its transitive @refarm.dev/source-contract-v1 is pinned
// via a workspace override until both publish.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/source-web";
const TGZ = "file:vendor/refarm.dev-source-web-0.1.0.tgz";

test("vault-seed pins @refarm.dev/source-web via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.dependencies?.[PKG], TGZ);
});

test("the transitive @refarm.dev/source-contract-v1 is pinned via workspace override", () => {
  const ws = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  assert.match(
    ws,
    /@refarm\.dev\/source-contract-v1["']?:\s*["']?file:vendor\/refarm\.dev-source-contract-v1-0\.1\.0\.tgz/,
    "missing source-contract-v1 file: override",
  );
});

test("the consumed source-web surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = ["index", "types", "reference"]
    .map((f) => {
      try {
        return readFileSync(join(base, `${f}.d.ts`), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
  for (const name of [
    "createWebSourceProvider",
    "WebSourceProvider",
    "WebSourceSnapshot",
    "WebSourceProvenance",
    "WebSourceMaterializeResult",
    "DEFAULT_WEB_SOURCE_FIXTURE",
  ]) {
    assert.match(dts, new RegExp(`\\b${name}\\b`), `missing ${name}`);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// vault-seed consumes @refarm.dev/enrichment-contract-v1 (enrichment:v1) for the
// records ETL enrichment seam. This pins the local tarball and the consumed surface.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/enrichment-contract-v1";
const TGZ = "file:vendor/refarm.dev-enrichment-contract-v1-0.1.0.tgz";

test("vault-seed pins @refarm.dev/enrichment-contract-v1 via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.dependencies?.[PKG], TGZ);
});

test("the consumed enrichment:v1 surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = ["index", "types", "conformance", "reference"]
    .map((f) => readFileSync(join(base, `${f}.d.ts`), "utf8"))
    .join("\n");
  for (const name of [
    "ENRICHMENT_CAPABILITY",
    "EnrichmentProvider",
    "EnrichmentInput",
    "EnrichmentChange",
    "EnrichmentResult",
    "EnrichmentErrorCode",
    "runEnrichmentV1Conformance",
    "createReferenceEnrichmentProvider",
  ]) {
    assert.match(dts, new RegExp(`\\b${name}\\b`), `missing ${name}`);
  }
});

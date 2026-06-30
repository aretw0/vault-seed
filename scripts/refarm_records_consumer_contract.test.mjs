import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// vault-seed consumes @refarm.dev/records-contract-v1 (records:v1) as the structured
// record model for the records view + ETL. This pins the tarball and the consumed surface.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/records-contract-v1";
const TGZ = "file:vendor/refarm.dev-records-contract-v1-0.1.0.tgz";

test("vault-seed pins @refarm.dev/records-contract-v1 via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.dependencies?.[PKG], TGZ);
});

test("the consumed records:v1 surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = ["index", "types", "conformance", "reference"]
    .map((f) => readFileSync(join(base, `${f}.d.ts`), "utf8"))
    .join("\n");
  for (const name of [
    "RECORDS_CAPABILITY",
    "CURRENT_RECORD_SCHEMA_VERSION",
    "KnowledgeRecord",
    "RecordRelation",
    "RecordsManifest",
    "RecordsProvider",
    "runRecordsV1Conformance",
    "computeRecordContentHash",
    "createReferenceRecordsProvider",
  ]) {
    assert.match(dts, new RegExp(`\\b${name}\\b`), `missing ${name}`);
  }
});

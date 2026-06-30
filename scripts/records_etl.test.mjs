import test from "node:test";
import assert from "node:assert/strict";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import * as recordsMod from "@refarm.dev/records-contract-v1";
import { createReferenceEnrichmentProvider } from "@refarm.dev/enrichment-contract-v1";
import { runRecordsProfile } from "./records_etl.mjs";

const plainTransform = () => [
  { id: "a", fields: { key: "K-001" } },
  { id: "b", fields: { key: "K-002" } },
];

const hashedTransform = () => {
  const { CURRENT_RECORD_SCHEMA_VERSION, computeRecordContentHash } = recordsMod;
  const mk = (id, key) => {
    const r = {
      id, schemaVersion: CURRENT_RECORD_SCHEMA_VERSION, "@type": "Requirement",
      "@context": "https://schema.example/v1", fields: { key }, sections: [], relations: [],
      sourceRefs: [], review: { state: "draft" }, contentHash: "",
    };
    r.contentHash = computeRecordContentHash(r);
    return r;
  };
  return [mk("a", "K-001"), mk("b", "K-002")];
};

test("runRecordsProfile degrades gracefully without refarm packages", async () => {
  const r = await runRecordsProfile({ snapshot: {}, transform: plainTransform }, { refarm: null });
  assert.equal(r.degraded, true);
  assert.equal(r.records.length, 2);
  assert.equal(r.manifest, null);
  assert.equal(r.validation, null);
});

test("runRecordsProfile builds + validates a records:v1 manifest and enriches", async () => {
  const enrichmentProvider = createReferenceEnrichmentProvider({
    keyField: "key",
    fixture: { "K-001": { fields: { tag: "alpha" } }, "K-002": { fields: { tag: "beta" } } },
  });
  const r = await runRecordsProfile(
    { snapshot: {}, transform: hashedTransform, enrichmentProvider },
    { refarm: { records: recordsMod } },
  );
  assert.equal(r.degraded, false);
  assert.equal(r.validation.ok, true, JSON.stringify(r.validation));
  assert.equal(r.enriched.diagnostics.enriched, 2);
});

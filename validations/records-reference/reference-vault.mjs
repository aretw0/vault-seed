// Sanitized reference vault — the T3 composition proof / acceptance gate.
//
// Proves that the generic refarm blocks compose end-to-end into a records vault
// "as it would have been built if the blocks existed from the start", using ONLY
// generic blocks + three sanitized fixtures:
//   1. the source fixture      (source-web's DEFAULT_WEB_SOURCE_FIXTURE)
//   2. the ETL transform       (mkRecord below — snapshot -> records:v1)
//   3. the enrichment provider (reference provider over a local fixture map)
//
// The real downstream POC swaps exactly those three fixtures for private adapters
// (real auth/selectors, real enrichment lookup). Nothing else changes. If any seam
// has to be forked to work, it lands in `gaps` — the early-warning before the POC.
import { createWebSourceProvider, DEFAULT_WEB_SOURCE_FIXTURE } from "@refarm.dev/source-web";
import {
  createReferenceRecordsProvider,
  computeRecordContentHash,
  CURRENT_RECORD_SCHEMA_VERSION,
  RECORDS_MANIFEST_VERSION,
} from "@refarm.dev/records-contract-v1";
import { createReferenceEnrichmentProvider } from "@refarm.dev/enrichment-contract-v1";

export async function runReferenceVault() {
  const gaps = [];
  const track = async (name, fn) => {
    try {
      return await fn();
    } catch (e) {
      gaps.push(`${name}: ${e.message}`);
      return undefined;
    }
  };

  // 1. ACQUIRE — source:v1 web adapter over a sanitized fixture (no private target).
  const web = createWebSourceProvider();
  const url = DEFAULT_WEB_SOURCE_FIXTURE.url;
  const materialized = await track("source-web.materialize", () => web.materialize(url));
  const provenance = await track("source-web.snapshotProvenance", () => web.snapshotProvenance(url));
  const body = DEFAULT_WEB_SOURCE_FIXTURE.body;

  // 2. STRUCTURE — the vault ETL transform: snapshot -> records:v1 (fixture transform).
  const mkRecord = (id, key, title) => {
    const record = {
      id,
      schemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
      "@type": "Requirement",
      "@context": "https://schema.example/v1",
      fields: { key, title },
      sections: [{ key: "description", content: body.slice(0, 40) }],
      relations: [],
      sourceRefs: [`web:${DEFAULT_WEB_SOURCE_FIXTURE.identity}`],
      review: { state: "draft" },
      contentHash: "",
    };
    record.contentHash = computeRecordContentHash(record);
    return record;
  };
  const manifest = {
    manifestVersion: RECORDS_MANIFEST_VERSION,
    records: [mkRecord("req-1", "K-001", "First"), mkRecord("req-2", "K-002", "Second")],
  };
  const validation = await track("records:v1.validate", () => createReferenceRecordsProvider().validate(manifest));
  if (validation && !validation.ok) gaps.push(`records validate failures: ${JSON.stringify(validation.failures)}`);

  // 3. ENRICH — enrichment:v1 over the records (fixture provider keyed on a field).
  const enricher = createReferenceEnrichmentProvider({
    keyField: "key",
    fixture: { "K-001": { fields: { tag: "alpha" } }, "K-002": { fields: { tag: "beta" } } },
  });
  const inputs = manifest.records.map((r) => ({ id: r.id, fields: r.fields, sourceRef: r.sourceRefs?.[0] }));
  const enriched = await track("enrichment:v1.enrich", () => enricher.enrich(inputs, { mode: "dry-run" }));

  return { gaps, materialized, provenance, manifest, validation, enriched };
}

// Generic records ETL profile runner.
//
// Turns a materialized source snapshot into a records:v1 manifest, optionally
// enriched, by consuming the refarm contracts. The refarm packages are loaded via
// OPTIONAL dynamic import so a template-distributed vault without @refarm.dev/*
// degrades to passing the raw records through (no validation/enrichment) instead of
// breaking. The `transform` (snapshot -> records:v1[]) is the product seam the caller
// supplies; a real profile pairs it with a source:v1 snapshot and an enrichment provider.

async function loadRefarmRecords() {
  try {
    return { records: await import("@refarm.dev/records-contract-v1") };
  } catch {
    return null;
  }
}

/**
 * Run a records ETL profile.
 * @param {object} profile
 * @param {unknown} profile.snapshot              source:v1 materialized snapshot (caller-provided)
 * @param {(snapshot: unknown) => object[]} profile.transform  snapshot -> records:v1[] (product seam)
 * @param {{ enrich: Function }} [profile.enrichmentProvider]  enrichment:v1 provider (optional)
 * @param {{ refarm?: { records: object } | null }} [deps]     injectable for tests
 * @returns {Promise<{ degraded: boolean, records: object[], manifest: object|null,
 *                     validation: object|null, enriched: object|null }>}
 */
export async function runRecordsProfile(profile, deps = {}) {
  const { snapshot, transform, enrichmentProvider } = profile;
  const records = transform(snapshot);

  const refarm = "refarm" in deps ? deps.refarm : await loadRefarmRecords();
  if (!refarm) {
    // Graceful degradation: no refarm packages — return raw records, unvalidated/unenriched.
    return { degraded: true, records, manifest: null, validation: null, enriched: null };
  }

  const { createReferenceRecordsProvider, RECORDS_MANIFEST_VERSION } = refarm.records;
  const manifest = { manifestVersion: RECORDS_MANIFEST_VERSION, records };
  const validation = createReferenceRecordsProvider().validate(manifest);

  let enriched = null;
  if (enrichmentProvider) {
    const inputs = records.map((r) => ({ id: r.id, fields: r.fields, sourceRef: r.sourceRefs?.[0] }));
    enriched = await enrichmentProvider.enrich(inputs, { mode: "dry-run" });
  }

  return { degraded: false, records, manifest, validation, enriched };
}

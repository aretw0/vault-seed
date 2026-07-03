import { expect, test } from "vitest";
import * as recordsMod from "@refarm.dev/records-contract-v1";

import { runVaultRecordsProfile } from "./vault_records_profile.mjs";

function record(id, fields) {
  const base = {
    id,
    schemaVersion: recordsMod.CURRENT_RECORD_SCHEMA_VERSION,
    "@type": ["KnowledgeRecord", "Source"],
    "@context": "https://refarm.dev/contexts/records/v1",
    fields,
    sections: [],
    relations: [],
    sourceRefs: [`vault:${id}`],
    review: { state: "draft" },
    contentHash: "",
  };
  base.contentHash = recordsMod.computeRecordContentHash(base);
  return base;
}

test("vault records profile composes source records, records:v1 validation, and enrichment", async () => {
  const records = [
    record("fontes/alpha", { title: "Alpha", sourceLocation: "https://alpha.example/feed.xml" }),
    record("fontes/beta", { title: "Beta", sourceLocation: "https://beta.example/feed.xml" }),
  ];

  const report = await runVaultRecordsProfile(
    {
      source: async () => ({
        generated: "2026-07-03T00:00:00.000Z",
        degraded: false,
        records,
        manifest: { manifestVersion: recordsMod.RECORDS_MANIFEST_VERSION, records },
        validation: { ok: true, failures: [] },
      }),
      enrichment: {
        keyField: "sourceLocation",
        at: "2026-07-03T00:00:00.000Z",
        lookup: async (key) =>
          key.includes("alpha") ? { category: "reference" } : null,
      },
    },
    { refarm: { records: recordsMod } },
  );

  expect(report.schema).toBe("vault.records-profile.report.v1");
  expect(report.profile.id).toBe("vault-default");
  expect(report.source.recordCount).toBe(2);
  expect(report.result.validationOk).toBe(true);
  expect(report.result.enrichment).toMatchObject({
    total: 2,
    enriched: 1,
    skipped: 1,
    byCode: { NO_MATCH: 1 },
  });
});

test("vault records profile degrades when refarm records are unavailable", async () => {
  const report = await runVaultRecordsProfile(
    {
      source: async () => ({
        generated: "2026-07-03T00:00:00.000Z",
        degraded: true,
        records: [{ id: "structural", fields: { title: "Structural" } }],
        manifest: null,
        validation: null,
      }),
    },
    { refarm: null },
  );

  expect(report.source.degraded).toBe(true);
  expect(report.result.degraded).toBe(true);
  expect(report.result.validationOk).toBe(null);
  expect(report.result.recordCount).toBe(1);
});

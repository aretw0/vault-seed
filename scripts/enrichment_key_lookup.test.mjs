import { test, expect } from "vitest";
import { runEnrichmentV1Conformance } from "@refarm.dev/enrichment-contract-v1";
import { createKeyLookupEnrichmentProvider } from "./enrichment_key_lookup.mjs";

const FIXTURE = { k1: { label: "Kappa One", tier: "gold" }, k2: { label: "Kappa Two" } };
const makeProvider = () =>
  createKeyLookupEnrichmentProvider({
    keyField: "code",
    lookup: (key) => FIXTURE[key] ?? null,
    providerId: "test-lookup",
  });

test("enriches a record whose key resolves — changes carry provenance", async () => {
  const result = await makeProvider().enrich([
    { id: "r1", fields: { code: "k1", label: null }, sourceRef: "vault:r1" },
  ]);
  expect(result.mode).toBe("dry-run");
  expect(result.diagnostics).toMatchObject({ total: 1, enriched: 1, skipped: 0 });

  const labelChange = result.records[0].changes.find((c) => c.field === "label");
  expect(labelChange).toMatchObject({ before: null, after: "Kappa One" });
  expect(labelChange.provenance).toMatchObject({ providerId: "test-lookup", key: "k1", sourceRef: "vault:r1" });
  expect(typeof labelChange.provenance.hash).toBe("string");
  expect(typeof labelChange.provenance.at).toBe("string");
});

test("skips NO_KEY (no key field) and NO_MATCH (key not found)", async () => {
  const result = await makeProvider().enrich([
    { id: "no-key", fields: {} },
    { id: "no-match", fields: { code: "zzz" } },
  ]);
  expect(result.diagnostics.enriched).toBe(0);
  expect(result.diagnostics.skipped).toBe(2);
  expect(result.records.find((r) => r.id === "no-key").skipped.code).toBe("NO_KEY");
  expect(result.records.find((r) => r.id === "no-match").skipped.code).toBe("NO_MATCH");
});

test("select filters to records that carry the key", () => {
  const selected = makeProvider().select([
    { id: "a", fields: { code: "k1" } },
    { id: "b", fields: {} },
  ]);
  expect(selected.map((s) => s.id)).toEqual(["a"]);
});

test("conforms to enrichment:v1", async () => {
  // The conformance drives its own SAMPLE_INPUTS (keyField "externalKey"; REQ-1 matches, REQ-404 does not),
  // so the checked provider is configured to that shape; `at` is fixed for dry-run/apply idempotency.
  const provider = createKeyLookupEnrichmentProvider({
    keyField: "externalKey",
    lookup: (key) => (key === "REQ-1" ? { status: "reviewed" } : null),
    providerId: "conformance-lookup",
    at: "2026-07-02T00:00:00.000Z",
  });
  const result = await runEnrichmentV1Conformance(provider);
  expect(result.pass, JSON.stringify(result.failures)).toBe(true);
});

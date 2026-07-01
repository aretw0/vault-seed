import { test, expect } from "vitest";
import { runReferenceVault } from "./reference-vault.mjs";

// Acceptance gate for the T3 records pipeline: the generic refarm blocks
// (source-web -> records:v1 -> enrichment:v1) must compose end-to-end with no
// seam gaps, using only sanitized fixtures. See reference-vault.mjs.

test("the reference vault composes the pipeline with no seam gaps", async () => {
  const { gaps } = await runReferenceVault();
  expect(gaps, `gap ledger not empty: ${gaps.join("; ")}`).toEqual([]);
});

test("acquisition carries web provenance (session, cache hash, redaction)", async () => {
  const { provenance } = await runReferenceVault();
  expect(provenance?.session, "session evidence present").toBeTruthy();
  expect(provenance?.cache?.hash, "cache hash present").toBeTruthy();
  expect(typeof provenance?.redaction?.applied, "redaction report present").toBe("boolean");
});

test("records validate and enrichment adds provenanced changes", async () => {
  const { validation, enriched } = await runReferenceVault();
  expect(validation?.ok, "records manifest validates").toBe(true);
  expect(enriched?.diagnostics?.enriched, "both records enriched").toBe(2);
  const change = enriched?.records?.[0]?.changes?.[0];
  expect(change?.provenance?.providerId, "change has provider provenance").toBeTruthy();
  expect(change?.provenance?.key, "change records the resolved key").toBeTruthy();
  expect(change?.provenance?.hash, "change records a payload hash").toBeTruthy();
});

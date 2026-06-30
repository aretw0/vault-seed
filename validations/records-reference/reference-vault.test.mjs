import test from "node:test";
import assert from "node:assert/strict";
import { runReferenceVault } from "./reference-vault.mjs";

// Acceptance gate for the T3 records pipeline: the generic refarm blocks
// (source-web -> records:v1 -> enrichment:v1) must compose end-to-end with no
// seam gaps, using only sanitized fixtures. See reference-vault.mjs.

test("the reference vault composes the pipeline with no seam gaps", async () => {
  const { gaps } = await runReferenceVault();
  assert.deepEqual(gaps, [], `gap ledger not empty: ${gaps.join("; ")}`);
});

test("acquisition carries web provenance (session, cache hash, redaction)", async () => {
  const { provenance } = await runReferenceVault();
  assert.ok(provenance?.session, "session evidence present");
  assert.ok(provenance?.cache?.hash, "cache hash present");
  assert.equal(typeof provenance?.redaction?.applied, "boolean", "redaction report present");
});

test("records validate and enrichment adds provenanced changes", async () => {
  const { validation, enriched } = await runReferenceVault();
  assert.equal(validation?.ok, true, "records manifest validates");
  assert.equal(enriched?.diagnostics?.enriched, 2, "both records enriched");
  const change = enriched?.records?.[0]?.changes?.[0];
  assert.ok(change?.provenance?.providerId, "change has provider provenance");
  assert.ok(change?.provenance?.key, "change records the resolved key");
  assert.ok(change?.provenance?.hash, "change records a payload hash");
});

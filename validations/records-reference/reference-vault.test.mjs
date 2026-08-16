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
  expect(enriched?.diagnostics?.enriched, "both web records enriched").toBe(2);
  const change = enriched?.records?.[0]?.changes?.[0];
  expect(change?.provenance?.providerId, "change has provider provenance").toBeTruthy();
  expect(change?.provenance?.key, "change records the resolved key").toBeTruthy();
  expect(change?.provenance?.hash, "change records a payload hash").toBeTruthy();
});

// The content lane. A vault is Markdown before it is anything else, and until now this
// proof had no MD/MDX branch at all: STRUCTURE existed only as the hand-written `mkRecord`
// closure over a web snapshot. `@refarm.dev/content-projection` is the generic block for
// that branch, and these tests are what make consuming it a measured fact rather than a
// claim -- the same bar `source-web` and `enrichment-contract-v1` already meet here.

test("MD/MDX content projects into records through the generic block", async () => {
  const { contentRecords } = await runReferenceVault();
  expect(contentRecords, "content lane produced records").toHaveLength(2);
  expect(contentRecords[0].fields.title, "frontmatter became a field").toBe("Nota um");
  expect(contentRecords[0]["content-projection:mediaType"]).toBe("text/markdown");
  expect(contentRecords[1]["content-projection:mediaType"]).toBe("text/mdx");
});

test("a wikilink between notes becomes a records:v1 relation", async () => {
  const { contentRecords } = await runReferenceVault();
  const targets = contentRecords[0].relations.map((relation) => relation.target);
  expect(targets, "the wikilink resolved to the sibling record").toContain(contentRecords[1].id);
});

// The seam this lane exists to test. A projected record carries three `content-projection:*`
// keys a hand-built record does not. If the records:v1 validator rejects them beside an ETL
// record, the block does not compose and that belongs in `gaps` BEFORE a POC depends on it.
test("projected content records are citizens of the same validated manifest", async () => {
  const { manifest, validation, contentRecords } = await runReferenceVault();
  const ids = manifest.records.map((record) => record.id);
  for (const record of contentRecords) {
    expect(ids, `${record.id} joined the manifest`).toContain(record.id);
  }
  expect(validation?.ok, "one manifest validates web ETL and projected content together").toBe(
    true,
  );
});

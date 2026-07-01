import { test, expect } from "vitest";
import { buildRecordsManifest, resolveLinks } from "./generate_records_manifest.mjs";

test("resolveLinks maps wikilink targets to record ids, dropping unresolved and self", () => {
  const notes = [
    { id: "a", title: "Alpha", path: "20 - Projetos/a.md", links: ["Beta", "Ghost"] },
    { id: "b", title: "Beta", path: "30 - Áreas/b.md", links: ["Alpha", "Beta"] },
  ];
  const [ra, rb] = resolveLinks(notes);
  expect(ra.links).toEqual(["b"]); // Beta → b; "Ghost" (no note) dropped
  expect(rb.links).toEqual(["a"]); // Alpha → a; self-link (Beta → b) dropped
});

// The distributable artifact proof: the real vault projects into a VALIDATED records:v1 manifest.
// This is the "notes ARE records" convergence — the same shape any ecosystem tool consumes.
test("buildRecordsManifest emits a validated records:v1 manifest from the real vault", async () => {
  const out = await buildRecordsManifest();

  expect(out.degraded, "records-contract is vendored, so not degraded").toBe(false);
  expect(out.manifest.manifestVersion).toBeGreaterThanOrEqual(1);
  expect(out.records.length).toBeGreaterThan(0);
  expect(
    out.validation.ok,
    `manifest must validate; first failures: ${JSON.stringify(out.validation.failures?.slice(0, 3))}`,
  ).toBe(true);

  // Each record carries the records:v1 envelope (type array, base context, stamped hash).
  const r = out.records[0];
  expect(r["@type"][0]).toBe("KnowledgeRecord");
  expect(r["@context"]).toBe("https://refarm.dev/contexts/records/v1");
  expect(r.contentHash).toBeTruthy();
  expect(r.schemaVersion).toBeGreaterThanOrEqual(1);
});

// Cohesion: records:v1 models ANY knowledge entity, not just notes. The vault's feed subscriptions
// become @type Source records carrying the source:v1 vocabulary — same manifest, one shape.
test("feed subscriptions become @type Source records (source:v1 vocab) in the same manifest", async () => {
  const out = await buildRecordsManifest();
  const sources = out.records.filter((r) => Array.isArray(r["@type"]) && r["@type"][1] === "Source");

  expect(sources.length, "the example vault ships feeds → Source records").toBeGreaterThan(0);
  const feed = sources[0];
  expect(feed["@type"]).toEqual(["KnowledgeRecord", "Source"]);
  expect(feed.fields.sourceKind).toBe("feed");
  expect(typeof feed.fields.sourceLocation, "carries the source:v1 sourceLocation").toBe("string");

  // Notes and Sources coexist in one validated manifest — the model is general.
  expect(out.records.some((r) => r["@type"][1] !== "Source"), "notes coexist").toBe(true);
  expect(out.validation.ok, "the mixed manifest still validates").toBe(true);
});

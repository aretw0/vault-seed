import test from "node:test";
import assert from "node:assert/strict";
import * as recordsMod from "@refarm.dev/records-contract-v1";
import {
  noteToRecord, buildRecordsFromNotes, recordsToGraph, loadRecordsConfig, RECORDS_BASE_CONTEXT,
} from "./generate_records_data.mjs";

// The full records config — the canonical IaC of vault-seed's product opinions.
const CONFIG = {
  context: { base: RECORDS_BASE_CONTEXT, vocab: null },
  typeByFolder: { "20 - Projetos": "Project", "30 - Áreas": "Area" },
  defaultType: "Note",
  serialization: { format: "yaml-ld", fieldsFromFrontmatter: ["title", "status", "tags"], preserveFolderAs: "folder" },
  surface: { graph: { labelField: "folder", degree: "incoming" } },
};
const NOTES = [
  { id: "20-projetos/launch", title: "Launch", folder: "20 - Projetos", status: "active", tags: ["p"], links: ["30-areas/ops"] },
  { id: "30-areas/ops", title: "Ops", folder: "30 - Áreas", status: "evergreen", tags: [], links: [] },
];

test("noteToRecord: config-driven @type, refarm base @context, raw folder preserved", () => {
  const r = noteToRecord(NOTES[0], CONFIG);
  assert.deepEqual(r["@type"], ["KnowledgeRecord", "Project"]);
  assert.equal(r["@context"], RECORDS_BASE_CONTEXT);
  assert.equal(r.fields.folder, "20 - Projetos");
  assert.deepEqual(r.relations, [{ type: "links", target: "30-areas/ops" }]);
});

test("serialization.fieldsFromFrontmatter drives which fields are projected (not hardcoded)", () => {
  const cfg = { ...CONFIG, serialization: { fieldsFromFrontmatter: ["status"], preserveFolderAs: "folder" } };
  const r = noteToRecord(NOTES[0], cfg);
  assert.equal(r.fields.status, "active");
  assert.equal(r.fields.tags, undefined); // not requested → not projected
  assert.ok(r.fields.title); // title always ensured for surfaces
});

test("context.vocab (opt-in, vault-owned domain) extends @context as [base, vocab]", () => {
  const cfg = { ...CONFIG, context: { base: RECORDS_BASE_CONTEXT, vocab: "https://arthursilva.dev/vault/v1" } };
  assert.deepEqual(noteToRecord(NOTES[0], cfg)["@context"], [RECORDS_BASE_CONTEXT, "https://arthursilva.dev/vault/v1"]);
});

test("noteToRecord falls back to config.defaultType for an unmapped folder", () => {
  assert.deepEqual(noteToRecord({ id: "x", folder: "99 - Meta" }, CONFIG)["@type"], ["KnowledgeRecord", "Note"]);
});

test("the canonical vault.config.json carries the records IaC (types + serialization + surface)", () => {
  const cfg = loadRecordsConfig();
  assert.equal(cfg.typeByFolder?.["20 - Projetos"], "Project");
  assert.equal(cfg.serialization?.format, "yaml-ld");
  assert.equal(cfg.surface?.graph?.labelField, "folder");
});

test("buildRecordsFromNotes degrades gracefully without records:v1", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod: null, recordsConfig: CONFIG });
  assert.equal(out.degraded, true);
  assert.equal(out.records.length, 2);
});

test("buildRecordsFromNotes builds + validates a records:v1 manifest from notes", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod, recordsConfig: CONFIG });
  assert.equal(out.degraded, false);
  assert.equal(out.validation.ok, true, JSON.stringify(out.validation));
  assert.ok(out.manifest.records[0].contentHash);
});

test("recordsToGraph is generic; surface options (labelField, degree) come from config", () => {
  const records = NOTES.map((n) => noteToRecord(n, CONFIG));

  // default surface config: label by raw folder, degree = incoming
  const g1 = recordsToGraph(records, CONFIG.surface.graph);
  assert.deepEqual(g1.nodes.map((n) => n.folder), ["20 - Projetos", "30 - Áreas"]);
  assert.deepEqual(g1.links, [{ source: "20-projetos/launch", target: "30-areas/ops" }]);
  assert.equal(g1.nodes.find((n) => n.id === "30-areas/ops").degree, 1); // one incoming
  assert.equal(g1.nodes.find((n) => n.id === "20-projetos/launch").degree, 0); // incoming-only

  // alternative surface config: label by specific @type, degree = both (outgoing + incoming)
  const g2 = recordsToGraph(records, { labelField: "nope", degree: "both" });
  assert.deepEqual(g2.nodes.map((n) => n.folder), ["Project", "Area"]); // falls back to specific @type
  assert.equal(g2.nodes.find((n) => n.id === "20-projetos/launch").degree, 1); // one outgoing counted
});

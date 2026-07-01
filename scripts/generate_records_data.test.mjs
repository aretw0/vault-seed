import test from "node:test";
import assert from "node:assert/strict";
import * as recordsMod from "@refarm.dev/records-contract-v1";
import { noteToRecord, buildRecordsFromNotes, recordsToGraph, loadRecordsConfig } from "./generate_records_data.mjs";

// Intentional config drives folder -> @type (no hardcoded opinion).
const CONFIG = {
  typeByFolder: { "20 - Projetos": "Project", "30 - Áreas": "Area" },
  defaultType: "Note",
};
const NOTES = [
  { id: "20-projetos/launch", title: "Launch", folder: "20 - Projetos", status: "active", tags: ["p"], links: ["30-areas/ops"] },
  { id: "30-areas/ops", title: "Ops", folder: "30 - Áreas", status: "evergreen", tags: [], links: [] },
];

test("noteToRecord derives @type from config and preserves the raw folder", () => {
  const r = noteToRecord(NOTES[0], CONFIG);
  assert.equal(r["@type"], "Project"); // config-driven
  assert.equal(r.fields.folder, "20 - Projetos"); // raw PARA folder preserved for surfaces
  assert.deepEqual(r.relations, [{ type: "links", target: "30-areas/ops" }]);
});

test("noteToRecord falls back to config.defaultType for an unmapped folder", () => {
  assert.equal(noteToRecord({ id: "x", folder: "99 - Meta" }, CONFIG)["@type"], "Note");
});

test("the canonical vault.config.json carries the records type mapping", () => {
  const cfg = loadRecordsConfig();
  assert.equal(cfg.typeByFolder?.["20 - Projetos"], "Project");
  assert.equal(cfg.defaultType, "Note");
});

test("buildRecordsFromNotes degrades gracefully without records:v1", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod: null, recordsConfig: CONFIG });
  assert.equal(out.degraded, true);
  assert.equal(out.records.length, 2);
  assert.equal(out.manifest, null);
});

test("buildRecordsFromNotes builds + validates a records:v1 manifest from notes", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod, recordsConfig: CONFIG });
  assert.equal(out.degraded, false);
  assert.equal(out.validation.ok, true, JSON.stringify(out.validation));
  assert.equal(out.manifest.records.length, 2);
  assert.ok(out.manifest.records[0].contentHash, "records are stamped with a content hash");
});

test("recordsToGraph derives the .site graph shape with the raw folder (drop-in)", () => {
  const records = NOTES.map((n) => noteToRecord(n, CONFIG));
  const graph = recordsToGraph(records);
  assert.deepEqual(
    graph.nodes.map((n) => ({ id: n.id, folder: n.folder, title: n.title })),
    [
      { id: "20-projetos/launch", folder: "20 - Projetos", title: "Launch" },
      { id: "30-areas/ops", folder: "30 - Áreas", title: "Ops" },
    ],
  );
  assert.deepEqual(graph.links, [{ source: "20-projetos/launch", target: "30-areas/ops" }]);
  assert.equal(graph.nodes.find((n) => n.id === "30-areas/ops").degree, 1);
});

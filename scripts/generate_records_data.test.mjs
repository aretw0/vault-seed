import { test, expect } from "vitest";
import * as recordsMod from "@refarm.dev/records-contract-v1";
import {
  noteToRecord, buildRecordsFromNotes, recordsToGraph, loadRecordsConfig, RECORDS_BASE_CONTEXT,
  buildRecordsGraph, folderLabel,
} from "./generate_records_data.mjs";

// The full records config — the canonical IaC of vault-seed's product opinions.
const CONFIG = {
  context: { base: RECORDS_BASE_CONTEXT, vocab: null },
  typeByFolder: { "20 - Projetos": "Project", "30 - Áreas": "Area" },
  defaultType: "Note",
  serialization: { format: "yaml-ld", fieldsFromFrontmatter: ["title", "status", "tags"], preserveFolderAs: "folder" },
  surface: { graph: { labelField: "folder", degree: "both" } },
};
const NOTES = [
  { id: "20-projetos/launch", title: "Launch", folder: "20 - Projetos", status: "active", tags: ["p"], links: ["30-areas/ops"] },
  { id: "30-areas/ops", title: "Ops", folder: "30 - Áreas", status: "evergreen", tags: [], links: [] },
];

test("noteToRecord: config-driven @type, refarm base @context, raw folder preserved", () => {
  const r = noteToRecord(NOTES[0], CONFIG);
  expect(r["@type"]).toEqual(["KnowledgeRecord", "Project"]);
  expect(r["@context"]).toBe(RECORDS_BASE_CONTEXT);
  expect(r.fields.folder).toBe("20 - Projetos");
  expect(r.relations).toEqual([{ type: "links", target: "30-areas/ops" }]);
});

test("serialization.fieldsFromFrontmatter drives which fields are projected (not hardcoded)", () => {
  const cfg = { ...CONFIG, serialization: { fieldsFromFrontmatter: ["status"], preserveFolderAs: "folder" } };
  const r = noteToRecord(NOTES[0], cfg);
  expect(r.fields.status).toBe("active");
  expect(r.fields.tags).toBe(undefined); // not requested → not projected
  expect(r.fields.title).toBeTruthy(); // title always ensured for surfaces
});

test("context.vocab (opt-in, vault-owned domain) extends @context as [base, vocab]", () => {
  const cfg = { ...CONFIG, context: { base: RECORDS_BASE_CONTEXT, vocab: "https://arthursilva.dev/vault/v1" } };
  expect(noteToRecord(NOTES[0], cfg)["@context"]).toEqual([RECORDS_BASE_CONTEXT, "https://arthursilva.dev/vault/v1"]);
});

test("noteToRecord falls back to config.defaultType for an unmapped folder", () => {
  expect(noteToRecord({ id: "x", folder: "99 - Meta" }, CONFIG)["@type"]).toEqual(["KnowledgeRecord", "Note"]);
});

test("the canonical vault.config.json carries the records IaC (types + serialization + surface)", () => {
  const cfg = loadRecordsConfig();
  expect(cfg.typeByFolder?.["20 - Projetos"]).toBe("Project");
  expect(cfg.serialization?.format).toBe("yaml-ld");
  expect(cfg.surface?.graph?.labelField).toBe("folder");
});

test("buildRecordsFromNotes degrades gracefully without records:v1", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod: null, recordsConfig: CONFIG });
  expect(out.degraded).toBe(true);
  expect(out.records.length).toBe(2);
});

test("buildRecordsFromNotes builds + validates a records:v1 manifest from notes", async () => {
  const out = await buildRecordsFromNotes(NOTES, { recordsMod, recordsConfig: CONFIG });
  expect(out.degraded).toBe(false);
  expect(out.validation.ok, JSON.stringify(out.validation)).toBe(true);
  expect(out.manifest.records[0].contentHash).toBeTruthy();
});

test("recordsToGraph is generic; surface options (labelField, degree) come from config", () => {
  const records = NOTES.map((n) => noteToRecord(n, CONFIG));

  // config surface (labelField: folder, degree: both) — matches the current .site graph behavior
  const g1 = recordsToGraph(records, CONFIG.surface.graph);
  expect(g1.nodes.map((n) => n.folder)).toEqual(["20 - Projetos", "30 - Áreas"]); // raw folder
  expect(g1.links).toEqual([{ source: "20-projetos/launch", target: "30-areas/ops" }]);
  expect(g1.nodes.find((n) => n.id === "20-projetos/launch").degree).toBe(1); // one outgoing (both)
  expect(g1.nodes.find((n) => n.id === "30-areas/ops").degree).toBe(1); // one incoming (both)

  // alternative surface config: label by specific @type, degree = incoming-only
  const g2 = recordsToGraph(records, { labelField: "nope", degree: "incoming" });
  expect(g2.nodes.map((n) => n.folder)).toEqual(["Project", "Area"]); // falls back to specific @type
  expect(g2.nodes.find((n) => n.id === "20-projetos/launch").degree).toBe(0); // outgoing not counted
});

test("folderLabel strips the PARA number prefix", () => {
  expect(folderLabel("20 - Projetos")).toBe("Projetos");
  expect(folderLabel("Áreas")).toBe("Áreas");
});

test("buildRecordsGraph produces the .site graph from records (display folder, config surface)", () => {
  const graph = buildRecordsGraph(NOTES, CONFIG);
  // display-labelled folders (matches vault-explore's node.folder = area = folderLabel(folder))
  expect(graph.nodes.map((n) => n.folder)).toEqual(["Projetos", "Áreas"]);
  expect(graph.links).toEqual([{ source: "20-projetos/launch", target: "30-areas/ops" }]);
  // degree = both (out + in), from config.surface.graph — matches current behavior
  expect(graph.nodes.find((n) => n.id === "20-projetos/launch").degree).toBe(1);
  expect(graph.nodes.find((n) => n.id === "30-areas/ops").degree).toBe(1);
});

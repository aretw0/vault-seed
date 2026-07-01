// Project vault notes (PARA frontmatter) into a records:v1 manifest.
//
// This realizes the convergence direction from the records-view design: notes ARE
// records — frontmatter becomes `fields`, wikilinks become `relations` (graph edges),
// the PARA folder becomes the `@type`. The records view reads the emitted manifest, so
// the vault's existing content renders through the same generic surface as any record.
//
// records:v1 is loaded via OPTIONAL dynamic import: without @refarm.dev/* a generated
// vault still gets the structural records (just unvalidated, unstamped) instead of breaking.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "vault.config.json");

/**
 * Read the records config (folder -> @type mapping) from the canonical vault.config.json.
 * The mapping is intentional, explicit config — not a hardcoded opinion in code.
 */
export function loadRecordsConfig(path = CONFIG_PATH) {
  try {
    return JSON.parse(readFileSync(path, "utf8")).records ?? {};
  } catch {
    return {};
  }
}

/**
 * A single PARA note -> a structural records:v1 record. `@type` is config-driven
 * (`config.typeByFolder`, falling back to `config.defaultType`); the raw PARA folder is
 * preserved in `fields.folder` so surfaces that group/color by folder converge without loss.
 */
// records:v1 base JSON-LD context, owned by the refarm contract (matches its reference impl).
// A vault may extend it with its own vocabulary via `config.vocab` — a domain the vault controls —
// which is optional and, when set, makes `@context` an array [base, vaultVocab]. No domain is
// required for the base; it identifies the records:v1 contract, not the vault.
export const RECORDS_BASE_CONTEXT = "https://refarm.dev/contexts/records/v1";

export function noteToRecord(note, config = {}) {
  const type = (config.typeByFolder ?? {})[note.folder] ?? config.defaultType ?? "Note";

  // @context: refarm base (from the contract), optionally extended by a vault-owned vocab.
  const ctx = config.context ?? {};
  const base = ctx.base ?? RECORDS_BASE_CONTEXT;
  const context = ctx.vocab ? [base, ctx.vocab] : base;

  // fields: which frontmatter keys become record fields is config (YAML-LD serialization),
  // not a hardcoded opinion. The raw PARA folder is preserved under a configured key.
  const ser = config.serialization ?? {};
  const fieldKeys = ser.fieldsFromFrontmatter ?? ["title", "status", "tags"];
  const fields = {};
  for (const key of fieldKeys) fields[key] = note[key] ?? null;
  if (fields.title == null) fields.title = note.title ?? note.id;
  if (ser.preserveFolderAs) fields[ser.preserveFolderAs] = note.folder ?? null;

  return {
    id: note.id,
    "@type": ["KnowledgeRecord", type],
    "@context": context,
    fields,
    sections: [],
    relations: (note.links ?? []).map((target) => ({ type: "links", target })),
    sourceRefs: [`vault:${note.id}`],
    review: { state: note.status ?? "draft" },
  };
}

async function loadRecordsContract() {
  try {
    return await import("@refarm.dev/records-contract-v1");
  } catch {
    return null;
  }
}

/**
 * Build a records:v1 manifest from vault notes.
 * @param {object[]} notes  vault notes ({ id, title, folder, status, tags, links })
 * @param {{ recordsMod?: object | null }} [deps]  injectable for tests
 */
export async function buildRecordsFromNotes(notes, deps = {}) {
  const config = deps.recordsConfig ?? loadRecordsConfig();
  const records = notes.map((note) => noteToRecord(note, config));
  const recordsMod = "recordsMod" in deps ? deps.recordsMod : await loadRecordsContract();

  if (!recordsMod) {
    return { degraded: true, records, manifest: null, validation: null };
  }

  const { CURRENT_RECORD_SCHEMA_VERSION, RECORDS_MANIFEST_VERSION, computeRecordContentHash, createReferenceRecordsProvider } = recordsMod;
  const stamped = records.map((r) => {
    const record = { ...r, schemaVersion: CURRENT_RECORD_SCHEMA_VERSION, contentHash: "" };
    record.contentHash = computeRecordContentHash(record);
    return record;
  });
  const manifest = { manifestVersion: RECORDS_MANIFEST_VERSION, records: stamped };
  const validation = createReferenceRecordsProvider().validate(manifest);
  return { degraded: false, records: stamped, manifest, validation };
}

/**
 * Derive the `.site` graph shape ({ nodes, links }) from records:v1 records — the same
 * structure `VaultGraphView` already consumes. This is the convergence bridge for the graph:
 * records are nodes, `relations` are edges, so the graph reads one model. Pure/testable.
 * Generic (records → graph); surface-specific choices are options, driven by config
 * (`records.surface.graph`), never hardcoded here:
 *   - `labelField`: which record field labels a node (e.g. "folder"); falls back to the specific @type.
 *   - `degree`: "incoming" (edges pointing at a node) or "both" (outgoing + incoming).
 * @param {object[]} records  records:v1 records (from buildRecordsFromNotes / a manifest)
 * @param {{ labelField?: string, degree?: "incoming"|"both" }} [options]
 */
export function recordsToGraph(records, options = {}) {
  const labelField = options.labelField ?? "folder";
  const degreeMode = options.degree ?? "incoming";
  const specificType = (r) => (Array.isArray(r["@type"]) ? r["@type"][r["@type"].length - 1] : r["@type"]);
  const nodes = records.map((r) => ({
    id: r.id,
    title: r.fields?.title ?? r.id,
    folder: r.fields?.[labelField] ?? specificType(r) ?? "Note",
    tags: r.fields?.tags ?? [],
    degree: 0,
  }));
  const links = records.flatMap((r) =>
    (r.relations ?? []).map((rel) => ({ source: r.id, target: rel.target })),
  );
  const degree = new Map();
  for (const link of links) {
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    if (degreeMode === "both") degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;
  return { nodes, links };
}

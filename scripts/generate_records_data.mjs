// Project vault notes (PARA frontmatter) into a records:v1 manifest.
//
// This realizes the convergence direction from the records-view design: notes ARE
// records — frontmatter becomes `fields`, wikilinks become `relations` (graph edges),
// the PARA folder becomes the `@type`. The records view reads the emitted manifest, so
// the vault's existing content renders through the same generic surface as any record.
//
// records:v1 is loaded via OPTIONAL dynamic import: without @refarm.dev/* a generated
// vault still gets the structural records (just unvalidated, unstamped) instead of breaking.

const folderToType = (folder) => {
  const f = String(folder || "").toLowerCase();
  if (f.includes("project")) return "Project";
  if (f.includes("area")) return "Area";
  if (f.includes("resource")) return "Resource";
  if (f.includes("archive")) return "Archive";
  return "Note";
};

/** A single PARA note -> a structural records:v1 record (no schemaVersion/contentHash yet). */
export function noteToRecord(note) {
  return {
    id: note.id,
    "@type": folderToType(note.folder),
    "@context": "https://schema.dgk.vault/v1",
    fields: { title: note.title ?? note.id, status: note.status ?? null, tags: note.tags ?? [] },
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
  const records = notes.map(noteToRecord);
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

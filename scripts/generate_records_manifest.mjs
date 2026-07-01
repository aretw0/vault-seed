// Emit the records:v1 manifest from the vault's real notes — the distributable artifact of the
// "notes ARE records" convergence. Notes → records:v1 (the config-driven projection) → a validated
// RecordsManifest, served at a well-known path (`/records-manifest.json`) so any ecosystem tool
// consumes the same shape from any vault. See docs/superpowers/specs/2026-07-01-records-*.
//
// records:v1 is loaded via generate_records_data (optional dynamic import): without @refarm.dev/* the
// manifest still carries the structural records (unvalidated) instead of breaking.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildVaultData, slugify } from "./generate_vault_data.mjs";
import { buildRecordsFromNotes } from "./generate_records_data.mjs";

/**
 * Resolve each note's raw wikilink targets (title/path text) to record ids, so relations pass
 * referential integrity. Unresolved targets (typos, deleted notes) and self-links are dropped —
 * the manifest carries only real edges, exactly as the Explore graph resolves them.
 */
export function resolveLinks(notes) {
  const lookup = new Map();
  const add = (key, id) => {
    if (!key) return;
    const k = String(key).toLowerCase();
    if (!lookup.has(k)) lookup.set(k, id);
    const s = slugify(String(key)).toLowerCase();
    if (!lookup.has(s)) lookup.set(s, id);
  };
  for (const n of notes) {
    add(n.title, n.id);
    add(n.id, n.id);
    if (n.path) add(n.path.replace(/\.md$/, ""), n.id);
  }
  return notes.map((n) => {
    const resolved = new Set();
    for (const target of n.links ?? []) {
      const t = String(target).replace(/\.md$/, "").trim();
      const id = lookup.get(t.toLowerCase()) ?? lookup.get(slugify(t).toLowerCase());
      if (id && id !== n.id) resolved.add(id);
    }
    return { ...n, links: [...resolved].sort((a, b) => a.localeCompare(b, "pt")) };
  });
}

/**
 * Build the records:v1 manifest from the vault's notes (no I/O side effects).
 * @param {{ cwd?: string }} [opts]
 * @returns {Promise<{ generated: string, degraded: boolean, records: object[], manifest: object|null, validation: object|null }>}
 */
export async function buildRecordsManifest({ cwd = process.cwd() } = {}) {
  const { generated, notes } = buildVaultData({ cwd });
  const out = await buildRecordsFromNotes(resolveLinks(notes));
  return { generated, ...out };
}

/** Emit `public/records-manifest.json` — the distributable, discoverable artifact. */
export async function writeRecordsManifest({ cwd = process.cwd() } = {}) {
  const out = await buildRecordsManifest({ cwd });
  const outDir = join(cwd, "public");
  mkdirSync(outDir, { recursive: true });
  // Prefer the validated RecordsManifest; fall back to a structural manifest when the contract is
  // absent (graceful degradation) so a generated vault still emits a consumable artifact.
  const artifact = out.manifest ?? { manifestVersion: 1, records: out.records };
  writeFileSync(join(outDir, "records-manifest.json"), JSON.stringify(artifact, null, 2), "utf-8");
  return { ...out, outDir };
}

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isMain()) {
  const { records, degraded, validation, outDir } = await writeRecordsManifest();
  const state = degraded ? "structural (no @refarm.dev/records-contract-v1)" : `validated (ok=${validation?.ok})`;
  console.log(`records-manifest.json: ${records.length} records [${state}] em ${outDir}`);
}

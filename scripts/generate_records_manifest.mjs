// Build the records:v1 manifest from the vault's real notes — the distributable artifact of the
// "notes ARE records" convergence. Notes → records:v1 (the config-driven projection) → a validated
// RecordsManifest. It is SERVED by the astro endpoint `.site/pages/records-manifest.json.ts` (like the
// Explore data), so `/records-manifest.json` is always in the built site — no separate build step. Any
// ecosystem tool fetches it; its records carry the now-resolvable @context.
//
// records:v1 is loaded via generate_records_data (optional dynamic import): without @refarm.dev/* the
// manifest still carries the structural records (unvalidated) instead of breaking.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildVaultData, slugify } from "./generate_vault_data.mjs";
import { buildRecordsFromNotes } from "./generate_records_data.mjs";
import { parseOpmlFeeds } from "./prepare_feed_sources.mjs";

/**
 * The vault's feed subscriptions (fontes/feeds.opml) as `records:v1` — @type Source (config maps the
 * `fontes` folder to Source), carrying the source:v1 vocabulary (`sourceKind`/`sourceLocation`). This
 * demonstrates that records:v1 models any knowledge entity, not just notes — the same manifest, one
 * shape, cohesive across the ecosystem. Empty when there are no feeds (graceful).
 */
export function loadFeedRecords(cwd) {
  const opmlPath = join(cwd, "fontes", "feeds.opml");
  if (!existsSync(opmlPath)) return [];
  const { subscriptions } = parseOpmlFeeds(readFileSync(opmlPath, "utf8"));
  return subscriptions.map((sub) => ({
    id: `fontes/${slugify(sub.title)}`,
    title: sub.title,
    folder: "fontes", // config.typeByFolder maps "fontes" -> "Source"
    status: null,
    tags: Array.isArray(sub.category) ? sub.category : [],
    links: [],
    fields: {
      sourceKind: "feed",
      sourceLocation: sub.xmlUrl,
      ...(sub.htmlUrl ? { homepage: sub.htmlUrl } : {}),
    },
  }));
}

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
  const entities = [...resolveLinks(notes), ...loadFeedRecords(cwd)];
  const out = await buildRecordsFromNotes(entities);
  return { generated, ...out };
}

/** The served artifact shape: the validated RecordsManifest, or a structural fallback when degraded. */
export function toManifestArtifact(out) {
  return out.manifest ?? { manifestVersion: 1, records: out.records };
}

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isMain()) {
  const out = await buildRecordsManifest();
  const state = out.degraded
    ? "structural (no @refarm.dev/records-contract-v1)"
    : `validated (ok=${out.validation?.ok}, failures=${out.validation?.failures?.length ?? 0})`;
  console.log(`records:v1 manifest — ${out.records.length} records [${state}]`);
  if (!out.degraded && !out.validation?.ok) process.exitCode = 1;
}

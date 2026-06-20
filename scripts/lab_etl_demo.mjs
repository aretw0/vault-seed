#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { buildInformationArchitectureReport } from "../.site/lib/information-architecture-audit.mjs";
import { buildVaultData, slugify } from "./generate_vault_data.mjs";

/**
 * Returns the existing timestamp when the payload content (excluding the timestamp field)
 * matches the already-written file. Advances to now only when content actually changed.
 */
function stableTimestamp(outputPath, payloadWithoutTs, tsKey = "collectedAt") {
  if (existsSync(outputPath)) {
    try {
      const existing = JSON.parse(readFileSync(outputPath, "utf8"));
      const { [tsKey]: _ts, ...restExisting } = existing;
      if (JSON.stringify(restExisting) === JSON.stringify(payloadWithoutTs)) {
        return _ts;
      }
    } catch { /* corrupt or missing — fall through */ }
  }
  return new Date().toISOString();
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROFILE_OUTPUT = join(ROOT, ".dgk", "perfil-do-vault.json");
const CURATION_OUTPUT = join(ROOT, ".dgk", "curadoria-ia.json");
const GRAPH_OUTPUT = join(ROOT, ".dgk", "grafo-do-vault.json");
const JSONLD_OUTPUT = join(ROOT, ".dgk", "grafo-do-vault.jsonld");
const READING_LIST_SOURCE = join(ROOT, "fontes", "lista-leitura.json");
const READING_LIST_OUTPUT = join(ROOT, ".dgk", "lista-leitura.json");

function countWords(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function increment(map, key) {
  const normalized = key || "sem valor";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function top(map, limit = 12) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

const vault = buildVaultData({ cwd: ROOT });

const folders = new Map();
const statuses = new Map();
const tags = new Map();
const notes = [];

for (const entry of vault.notes) {
  const raw = readFileSync(join(ROOT, entry.path), "utf8");
  const parsed = matter(raw);
  const noteTags = Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [];

  increment(folders, entry.folder || "raiz");
  increment(statuses, parsed.data.status || "sem status");
  for (const tag of noteTags) increment(tags, tag);

  notes.push({
    id: entry.id,
    title: String(parsed.data.title || entry.title),
    folder: entry.folder || "raiz",
    status: String(parsed.data.status || "sem status"),
    tags: noteTags,
    words: countWords(parsed.content),
    links: Array.isArray(entry.links) ? entry.links : [],
  });
}

notes.sort((a, b) => b.words - a.words || a.title.localeCompare(b.title, "pt"));

const profileWithoutTs = {
  schemaVersion: 1,
  source: "scripts/lab_etl_demo.mjs",
  noteCount: notes.length,
  totalWords: notes.reduce((sum, note) => sum + note.words, 0),
  averageWords: notes.length
    ? Math.round(notes.reduce((sum, note) => sum + note.words, 0) / notes.length)
    : 0,
  folders: top(folders),
  statuses: top(statuses),
  tags: top(tags),
  largestNotes: notes.slice(0, 10),
};
const profileData = {
  ...profileWithoutTs,
  collectedAt: stableTimestamp(PROFILE_OUTPUT, profileWithoutTs),
};

const curationData = {
  schemaVersion: 1,
  source: ".site/lib/information-architecture-audit.mjs",
  ...buildInformationArchitectureReport({ root: ROOT }),
};

function lastPathSegment(value) {
  return String(value || "").split("/").filter(Boolean).at(-1) || "";
}

function linkLookupKey(value) {
  return slugify(String(value || "").split("#")[0].trim());
}

const linkIndex = new Map();
for (const note of notes) {
  for (const key of [
    note.id,
    slugify(note.title),
    slugify(lastPathSegment(note.id)),
  ]) {
    if (key && !linkIndex.has(key)) linkIndex.set(key, note.id);
  }
}

function resolveNoteLink(link) {
  const key = linkLookupKey(link);
  if (!key) return null;
  return linkIndex.get(key) ?? null;
}

const inboundCount = new Map(notes.map((n) => [n.id, 0]));
for (const note of notes) {
  for (const link of note.links) {
    const resolved = resolveNoteLink(link);
    if (resolved && inboundCount.has(resolved)) {
      inboundCount.set(resolved, inboundCount.get(resolved) + 1);
    }
  }
}
const graphNotes = notes.map((n) => ({
  id: n.id,
  title: n.title,
  folder: n.folder,
  status: n.status,
  outbound: n.links.length,
  inbound: inboundCount.get(n.id) ?? 0,
  brokenLinks: n.links.filter((link) => !resolveNoteLink(link)),
}));
const graphData = {
  schemaVersion: 1,
  source: "scripts/lab_etl_demo.mjs",
  noteCount: graphNotes.length,
  linkCount: notes.reduce((sum, n) => sum + n.links.length, 0),
  notes: graphNotes,
};

const jsonldWithoutTs = {
  "@context": {
    schema: "https://schema.org/",
    dgk: "https://aretw0.github.io/vault-seed/vocab/1.0#",
    name: "schema:name",
    Note: "dgk:Note",
    Vault: "dgk:Vault",
    folder: "dgk:folder",
    status: "dgk:status",
    inboundLinks: "dgk:inboundLinks",
    outboundLinks: "dgk:outboundLinks",
    brokenLinks: "dgk:brokenLinks",
    generatedAt: "schema:dateCreated",
    noteCount: "dgk:noteCount",
    linkCount: "dgk:linkCount",
  },
  "@type": "Vault",
  "@id": "vault:root",
  name: "vault-seed",
  noteCount: graphNotes.length,
  linkCount: graphData.linkCount,
  "@graph": graphNotes.map((n) => ({
    "@type": "Note",
    "@id": `note:${n.id}`,
    name: n.title,
    folder: n.folder,
    status: n.status,
    inboundLinks: n.inbound,
    outboundLinks: n.outbound,
    brokenLinks: n.brokenLinks,
  })),
};
const jsonldData = {
  ...jsonldWithoutTs,
  generatedAt: stableTimestamp(JSONLD_OUTPUT, jsonldWithoutTs, "generatedAt"),
};

const readingSource = JSON.parse(readFileSync(READING_LIST_SOURCE, "utf8"));
const topicCount = new Map();
const statusCount = new Map();
for (const item of readingSource) {
  const t = item.topic || "sem tópico";
  const s = item.status || "sem status";
  topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
}
const readingWithoutTs = {
  schemaVersion: 1,
  source: "fontes/lista-leitura.json",
  itemCount: readingSource.length,
  items: readingSource,
  topicSummary: Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count })),
  statusSummary: Array.from(statusCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count })),
};
const readingData = {
  ...readingWithoutTs,
  collectedAt: stableTimestamp(READING_LIST_OUTPUT, readingWithoutTs),
};

mkdirSync(join(ROOT, ".dgk"), { recursive: true });
writeFileSync(PROFILE_OUTPUT, `${JSON.stringify(profileData, null, 2)}\n`, "utf8");
writeFileSync(CURATION_OUTPUT, `${JSON.stringify(curationData, null, 2)}\n`, "utf8");
writeFileSync(GRAPH_OUTPUT, `${JSON.stringify(graphData, null, 2)}\n`, "utf8");
writeFileSync(JSONLD_OUTPUT, `${JSON.stringify(jsonldData, null, 2)}\n`, "utf8");
writeFileSync(READING_LIST_OUTPUT, `${JSON.stringify(readingData, null, 2)}\n`, "utf8");
console.log(`lab etl demo: ${notes.length} notas -> ${PROFILE_OUTPUT}`);
console.log(`lab etl demo: curadoria IA -> ${CURATION_OUTPUT}`);
console.log(`lab etl demo: grafo (${graphData.linkCount} links) -> ${GRAPH_OUTPUT}`);
console.log(`lab etl demo: grafo JSON-LD -> ${JSONLD_OUTPUT}`);
console.log(`lab etl demo: leitura (${readingData.itemCount} itens) -> ${READING_LIST_OUTPUT}`);

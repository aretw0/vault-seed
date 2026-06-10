#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { buildInformationArchitectureReport } from "../.site/lib/information-architecture-audit.mjs";
import { buildVaultData } from "./generate_vault_data.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROFILE_OUTPUT = join(ROOT, "dados", "lab", "perfil-do-vault.json");
const CURATION_OUTPUT = join(ROOT, "dados", "lab", "curadoria-ia.json");
const GRAPH_OUTPUT = join(ROOT, "dados", "lab", "grafo-do-vault.json");
const JSONLD_OUTPUT = join(ROOT, "dados", "lab", "grafo-do-vault.jsonld");
const READING_LIST_SOURCE = join(ROOT, "dados", "fontes", "lista-leitura.json");
const READING_LIST_OUTPUT = join(ROOT, "dados", "lab", "lista-leitura.json");

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

const profileData = {
  schemaVersion: 1,
  source: "scripts/lab_etl_demo.mjs",
  collectedAt: new Date().toISOString(),
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

const curationData = {
  schemaVersion: 1,
  source: ".site/lib/information-architecture-audit.mjs",
  ...buildInformationArchitectureReport({ root: ROOT }),
};

const allIds = new Set(notes.map((n) => n.id));
const inboundCount = new Map(notes.map((n) => [n.id, 0]));
for (const note of notes) {
  for (const link of note.links) {
    if (inboundCount.has(link)) inboundCount.set(link, inboundCount.get(link) + 1);
  }
}
const graphNotes = notes.map((n) => ({
  id: n.id,
  title: n.title,
  folder: n.folder,
  status: n.status,
  outbound: n.links.length,
  inbound: inboundCount.get(n.id) ?? 0,
  brokenLinks: n.links.filter((l) => !allIds.has(l)),
}));
const graphData = {
  schemaVersion: 1,
  source: "scripts/lab_etl_demo.mjs",
  noteCount: graphNotes.length,
  linkCount: notes.reduce((sum, n) => sum + n.links.length, 0),
  notes: graphNotes,
};

const jsonldData = {
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
  generatedAt: new Date().toISOString(),
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

const readingSource = JSON.parse(readFileSync(READING_LIST_SOURCE, "utf8"));
const topicCount = new Map();
const statusCount = new Map();
for (const item of readingSource) {
  const t = item.topic || "sem tópico";
  const s = item.status || "sem status";
  topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
}
const readingData = {
  schemaVersion: 1,
  source: "dados/fontes/lista-leitura.json",
  collectedAt: new Date().toISOString(),
  itemCount: readingSource.length,
  items: readingSource,
  topicSummary: Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count })),
  statusSummary: Array.from(statusCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count })),
};

mkdirSync(join(ROOT, "dados", "lab"), { recursive: true });
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

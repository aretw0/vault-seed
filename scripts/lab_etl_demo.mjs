#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { buildVaultData } from "./generate_vault_data.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT = join(ROOT, "dados", "lab", "perfil-do-vault.json");

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
    title: String(parsed.data.title || entry.title),
    folder: entry.folder || "raiz",
    status: String(parsed.data.status || "sem status"),
    tags: noteTags,
    words: countWords(parsed.content),
  });
}

notes.sort((a, b) => b.words - a.words || a.title.localeCompare(b.title, "pt"));

const data = {
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

mkdirSync(join(ROOT, "dados", "lab"), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`lab etl demo: ${notes.length} notas -> ${OUTPUT}`);

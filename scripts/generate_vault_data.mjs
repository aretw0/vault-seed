#!/usr/bin/env node
import { basename, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import matter from "gray-matter";

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

function resolveNotebooksPath(value = process.env.VAULT_NOTEBOOKS_PATH || "lab") {
  const normalized = String(value || "lab")
    .trim()
    .replaceAll(String.fromCharCode(92), "/")
    .replace(/^\/+|\/+$/g, "");

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new Error(
      `VAULT_NOTEBOOKS_PATH inválido: ${value}. Use um único segmento de URL, como "lab", "notebooks" ou "studio".`,
    );
  }

  return normalized;
}

const VAULT_FOLDERS = [
  "00 - Entrada",
  "10 - Diário",
  "20 - Projetos",
  "30 - Áreas",
  "40 - Recursos",
  "50 - Arquivo",
  "90 - Modelos",
  "99 - Meta e Anexos",
];

export function slugify(input) {
  return input
    .split("/")
    .map((segment) =>
      segment
        .replace(/^\d+\s*-\s*/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036F]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .join("/");
}

function extractLinks(content) {
  const links = [];
  let match;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}

export function buildVaultData({ cwd = process.cwd() } = {}) {
  const patterns = VAULT_FOLDERS.map((folder) => `${folder}/**/*.md`);
  const files = globSync(patterns, { cwd });

  const notes = files.map((file) => {
    const normalizedFile = file.replace(/\\/g, "/");
    const raw = readFileSync(join(cwd, file), "utf-8");
    const { data, content } = matter(raw);
    const rawTags = data.tags;

    return {
      id: slugify(normalizedFile.replace(/\.md$/, "")),
      path: normalizedFile,
      title: data.title ? String(data.title) : basename(file, ".md"),
      folder: normalizedFile.split("/")[0] ?? "",
      status: data.status ? String(data.status) : null,
      tags: Array.isArray(rawTags)
        ? rawTags.map(String)
        : typeof rawTags === "string"
          ? [rawTags]
          : [],
      links: extractLinks(content),
      created: data.created ? String(data.created) : null,
      updated: data.updated ? String(data.updated) : null,
    };
  });

  notes.sort((a, b) => a.id.localeCompare(b.id, "pt"));

  return {
    generated: new Date().toISOString(),
    noteCount: notes.length,
    notes,
  };
}

export function writeVaultData({
  cwd = process.cwd(),
  notebooksPath = resolveNotebooksPath(),
} = {}) {
  const data = buildVaultData({ cwd });
  const outDir = join(cwd, "public", resolveNotebooksPath(notebooksPath));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "vault-data.json"), JSON.stringify(data, null, 2), "utf-8");
  return { data, outDir };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { data, outDir } = writeVaultData();
  console.log(`vault-data.json: ${data.noteCount} notas escritas em ${outDir}`);
}

#!/usr/bin/env node
import { basename, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import matter from "gray-matter";
import { VAULT_FOLDERS } from "../.site/lib/vault-folders.mjs";

const CONTENT_EXTENSIONS = ["md", "mdx"];
const CONTENT_EXTENSION_RE = /\.(md|mdx)$/i;
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

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

export function contentGlobPatterns(folders = VAULT_FOLDERS) {
  return folders.flatMap((folder) => CONTENT_EXTENSIONS.map((extension) => `${folder}/**/*.${extension}`));
}

export function stripContentExtension(file) {
  return file.replace(CONTENT_EXTENSION_RE, "");
}

function inferMediaType(file) {
  return file.toLowerCase().endsWith(".mdx") ? "text/mdx" : "text/markdown";
}

export function parseVaultFrontmatter(text) {
  const { data, content } = matter(text);
  return { data, body: content };
}

export function extractVaultWikilinks(content) {
  const links = [];
  let match;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    const target = match[1]?.trim();
    if (target) links.push({ target });
  }
  return links;
}

function extractLinks(content) {
  return extractVaultWikilinks(content).map((link) => link.target.trim()).filter(Boolean);
}

export function loadVaultContentItems({ cwd = process.cwd() } = {}) {
  const files = globSync(contentGlobPatterns(), { cwd });
  return files.map((file) => {
    const normalizedFile = file.replace(/\\/g, "/");
    return {
      path: normalizedFile,
      text: readFileSync(join(cwd, file), "utf-8"),
      mediaType: inferMediaType(normalizedFile),
    };
  });
}

export function buildVaultData({ cwd = process.cwd() } = {}) {
  const notes = loadVaultContentItems({ cwd }).map((item) => {
    const { data, body } = parseVaultFrontmatter(item.text);
    const rawTags = data.tags;

    return {
      id: slugify(stripContentExtension(item.path)),
      path: item.path,
      title: data.title ? String(data.title) : basename(stripContentExtension(item.path)),
      folder: item.path.split("/")[0] ?? "",
      status: data.status ? String(data.status) : null,
      tags: Array.isArray(rawTags)
        ? rawTags.map(String)
        : typeof rawTags === "string"
          ? [rawTags]
          : [],
      links: extractLinks(body),
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

#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { globSync } from "glob";
import matter from "gray-matter";

const ROOT = process.cwd();
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
const ALLOWED_CATEGORIES = new Set([
  "conceito",
  "ferramenta",
  "guia",
  "moc",
  "referencia",
  "referência",
  "workflow",
]);
const ALLOWED_AUDIENCES = new Set([
  "iniciante",
  "intermediario",
  "intermediário",
  "tecnico",
  "técnico",
  "todos",
]);
const TEMPLATE_META_FOLDER = "99 - Meta e Anexos";
const RESOURCE_FOLDER = "40 - Recursos";

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function readNotes() {
  return globSync(VAULT_FOLDERS.map((folder) => `${folder}/**/*.md`), { cwd: ROOT })
    .map((file) => {
      const raw = readFileSync(join(ROOT, file), "utf8");
      const { data, content } = matter(raw);
      return {
        file: file.replace(/\\/g, "/"),
        title: data.title ? String(data.title) : basename(file, ".md"),
        folder: file.replace(/\\/g, "/").split("/")[0] ?? "",
        status: data.status ? String(data.status) : "",
        category: data.category ? String(data.category) : "",
        audience: data.audience ? String(data.audience) : "",
        tags: normalizeList(data.tags),
        words: content.split(/\s+/).filter(Boolean).length,
      };
    })
    .filter((note) => note.status === "published")
    .sort((a, b) => a.file.localeCompare(b.file, "pt"));
}

function audit(notes) {
  const errors = [];
  const warnings = [];
  const promotionCandidates = [];
  const thinPublishedResources = [];

  for (const note of notes) {
    if (!note.category) {
      errors.push(`${note.file}: nota publicada sem category.`);
    } else if (!ALLOWED_CATEGORIES.has(note.category)) {
      errors.push(`${note.file}: category desconhecida (${note.category}).`);
    }

    if (!note.audience) {
      errors.push(`${note.file}: nota publicada sem audience.`);
    } else if (!ALLOWED_AUDIENCES.has(note.audience)) {
      errors.push(`${note.file}: audience desconhecido (${note.audience}).`);
    }

    if (note.folder === TEMPLATE_META_FOLDER && note.category === "conceito") {
      promotionCandidates.push(note);
    }

    if (note.folder === RESOURCE_FOLDER && note.words < 140) {
      thinPublishedResources.push(note);
    }
  }

  if (promotionCandidates.length) {
    warnings.push(
      `Possíveis promoções de ${TEMPLATE_META_FOLDER} para ${RESOURCE_FOLDER}: ${promotionCandidates
        .map((note) => note.title)
        .join("; ")}`,
    );
  }

  if (thinPublishedResources.length) {
    warnings.push(
      `Recursos publicados ainda muito curtos: ${thinPublishedResources
        .map((note) => note.title)
        .join("; ")}`,
    );
  }

  return { errors, warnings, promotionCandidates, thinPublishedResources };
}

const notes = readNotes();
const result = audit(notes);

console.log(`IA audit: ${notes.length} nota(s) publicada(s) avaliadas.`);
if (result.warnings.length) {
  for (const warning of result.warnings) console.warn(`[warn] ${warning}`);
}
if (result.errors.length) {
  console.error("IA audit failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("IA audit passed.");

#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { globSync } from "glob";
import matter from "gray-matter";

import {
  deriveNoteIntents,
  getIntentLabel,
  loadInformationArchitecture,
  normalizeAudience,
  normalizeCategory,
} from "../.site/lib/information-architecture.mjs";

const ROOT = process.cwd();
const IA = loadInformationArchitecture(ROOT);
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
      const normalizedFile = file.replace(/\\/g, "/");
      const raw = readFileSync(join(ROOT, file), "utf8");
      const { data, content } = matter(raw);
      const category = data.category ? String(data.category) : "";
      const audience = data.audience ? String(data.audience) : "";
      return {
        file: normalizedFile,
        title: data.title ? String(data.title) : basename(file, ".md"),
        folder: normalizedFile.split("/")[0] ?? "",
        status: data.status ? String(data.status) : "",
        category,
        categoryKey: normalizeCategory(category, IA),
        audience,
        audienceKey: normalizeAudience(audience, IA),
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
  const intentCounts = new Map();
  const notesWithoutIntent = [];
  const ambiguousIntentNotes = [];

  for (const note of notes) {
    if (!note.category) {
      errors.push(`${note.file}: nota publicada sem category.`);
    } else if (!note.categoryKey) {
      errors.push(`${note.file}: category desconhecida (${note.category}).`);
    }

    if (!note.audience) {
      errors.push(`${note.file}: nota publicada sem audience.`);
    } else if (!note.audienceKey) {
      errors.push(`${note.file}: audience desconhecido (${note.audience}).`);
    }

    const intents = deriveNoteIntents(
      { ...note, category: note.categoryKey || note.category },
      IA,
      { fallback: null },
    );
    if (!intents.length) {
      notesWithoutIntent.push(note);
    }
    if (intents.length > 3) {
      ambiguousIntentNotes.push({ note, intents });
    }
    for (const intent of intents) {
      intentCounts.set(intent, (intentCounts.get(intent) ?? 0) + 1);
    }

    if (note.folder === TEMPLATE_META_FOLDER && note.categoryKey === "conceito") {
      promotionCandidates.push(note);
    }

    if (note.folder === RESOURCE_FOLDER && note.words < 140) {
      thinPublishedResources.push(note);
    }
  }

  if (notesWithoutIntent.length) {
    errors.push(
      `notas publicadas sem intenção derivada: ${notesWithoutIntent
        .map((note) => note.title)
        .join("; ")}.`,
    );
  }

  const emptyIntents = Object.keys(IA.intents).filter((intent) => !intentCounts.has(intent));
  if (emptyIntents.length) {
    errors.push(
      `intenção sem notas publicadas: ${emptyIntents.map((intent) => getIntentLabel(intent, IA)).join(", ")}.`,
    );
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

  if (ambiguousIntentNotes.length) {
    warnings.push(
      `Notas com muitas intenções derivadas: ${ambiguousIntentNotes
        .slice(0, 8)
        .map(({ note, intents }) => `${note.title} (${intents.map((intent) => getIntentLabel(intent, IA)).join(", ")})`)
        .join("; ")}`,
    );
  }

  warnings.push(
    `Distribuição por intenção: ${Array.from(intentCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt"))
      .map(([intent, count]) => `${getIntentLabel(intent, IA)}=${count}`)
      .join(", ")}`,
  );

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

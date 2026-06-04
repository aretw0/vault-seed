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
} from "./information-architecture.mjs";
import { VAULT_FOLDERS } from "./vault-folders.mjs";

const TEMPLATE_META_FOLDER = "99 - Meta e Anexos";
const RESOURCE_FOLDER = "40 - Recursos";

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function summarizeNote(note) {
  return {
    file: note.file,
    title: note.title,
    folder: note.folder,
    category: note.categoryKey || note.category,
    audience: note.audienceKey || note.audience,
    words: note.words,
  };
}

export function readPublishedNotes({ root = process.cwd(), ia = loadInformationArchitecture(root) } = {}) {
  return globSync(VAULT_FOLDERS.map((folder) => `${folder}/**/*.md`), { cwd: root })
    .map((file) => {
      const normalizedFile = file.replace(/\\/g, "/");
      const raw = readFileSync(join(root, file), "utf8");
      const { data, content } = matter(raw);
      const category = data.category ? String(data.category) : "";
      const audience = data.audience ? String(data.audience) : "";
      return {
        file: normalizedFile,
        title: data.title ? String(data.title) : basename(file, ".md"),
        folder: normalizedFile.split("/")[0] ?? "",
        status: data.status ? String(data.status) : "",
        category,
        categoryKey: normalizeCategory(category, ia),
        audience,
        audienceKey: normalizeAudience(audience, ia),
        tags: normalizeList(data.tags),
        words: content.split(/\s+/).filter(Boolean).length,
      };
    })
    .filter((note) => note.status === "published")
    .sort((a, b) => a.file.localeCompare(b.file, "pt"));
}

export function auditInformationArchitecture(notes, ia = loadInformationArchitecture(process.cwd())) {
  const errors = [];
  const warnings = [];
  const notices = [];
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
      ia,
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

  const emptyIntents = Object.keys(ia.intents).filter((intent) => !intentCounts.has(intent));
  if (emptyIntents.length) {
    errors.push(
      `intenção sem notas publicadas: ${emptyIntents.map((intent) => getIntentLabel(intent, ia)).join(", ")}.`,
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
        .map(({ note, intents }) => `${note.title} (${intents.map((intent) => getIntentLabel(intent, ia)).join(", ")})`)
        .join("; ")}`,
    );
  }

  const intentDistribution = Array.from(intentCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt"))
    .map(([intent, count]) => ({ intent, label: getIntentLabel(intent, ia), count }));

  notices.push(
    `Distribuição por intenção: ${intentDistribution
      .map(({ label, count }) => `${label}=${count}`)
      .join(", ")}`,
  );

  return {
    errors,
    warnings,
    notices,
    promotionCandidates: promotionCandidates.map(summarizeNote),
    thinPublishedResources: thinPublishedResources.map(summarizeNote),
    ambiguousIntentNotes: ambiguousIntentNotes.map(({ note, intents }) => ({
      note: summarizeNote(note),
      intents: intents.map((intent) => ({ intent, label: getIntentLabel(intent, ia) })),
    })),
    intentDistribution,
  };
}

export function buildInformationArchitectureReport({ root = process.cwd() } = {}) {
  const ia = loadInformationArchitecture(root);
  const notes = readPublishedNotes({ root, ia });
  const result = auditInformationArchitecture(notes, ia);

  return {
    notesEvaluated: notes.length,
    ...result,
  };
}

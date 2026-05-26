const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function loadInformationArchitecture(cwd = process.cwd()) {
  return JSON.parse(
    readFileSync(join(cwd, ".site", "information-architecture.json"), "utf8"),
  );
}

function buildAliasMap(vocabulary) {
  const aliases = new Map();
  for (const [key, entry] of Object.entries(vocabulary || {})) {
    aliases.set(normalizeKey(key), key);
    aliases.set(normalizeKey(entry.label), key);
    for (const alias of entry.aliases || []) aliases.set(normalizeKey(alias), key);
  }
  return aliases;
}

function normalizeVocabularyValue(value, vocabulary) {
  const key = buildAliasMap(vocabulary).get(normalizeKey(value));
  return key || null;
}

function getVocabularyLabel(key, vocabulary) {
  return vocabulary?.[key]?.label || key || "sem valor";
}

function normalizeCategory(value, ia) {
  return normalizeVocabularyValue(value, ia.categories);
}

function normalizeAudience(value, ia) {
  return normalizeVocabularyValue(value, ia.audiences);
}

function deriveNoteIntents(note, ia, options = {}) {
  const tags = new Set((note.tags || []).map((tag) => normalizeKey(tag)));
  const category = normalizeKey(note.category);
  const folder = note.folder || "";
  const matches = [];

  for (const [key, intent] of Object.entries(ia.intents || {})) {
    const byTag = (intent.tags || []).some((tag) => tags.has(normalizeKey(tag)));
    const byCategory = (intent.categories || []).some(
      (candidate) => normalizeKey(candidate) === category,
    );
    const byFolder = (intent.folders || []).includes(folder);
    if (byTag || byCategory || byFolder) matches.push(key);
  }

  const fallback = Object.hasOwn(options, "fallback") ? options.fallback : "organizar";
  if (matches.length) return matches;
  return fallback ? [fallback] : [];
}

function getIntentLabel(key, ia) {
  return ia.intents?.[key]?.label || key;
}

module.exports = {
  buildAliasMap,
  deriveNoteIntents,
  getIntentLabel,
  getVocabularyLabel,
  loadInformationArchitecture,
  normalizeAudience,
  normalizeCategory,
  normalizeKey,
  normalizeVocabularyValue,
};

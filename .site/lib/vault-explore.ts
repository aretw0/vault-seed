import { basename, dirname } from 'node:path';
import { slugify } from '@aretw0/dgk-astro-plugins';
import {
  deriveNoteIntents,
  getIntentLabel,
  getVocabularyLabel,
  loadInformationArchitecture,
  normalizeVocabularyValue,
} from './information-architecture.mjs';
import { buildInformationArchitectureReport } from './information-architecture-audit.mjs';
import { vaultStatus } from './vault-config.mjs';
import { buildRecordsGraph, buildRecordsTable, loadRecordsConfig } from '../../scripts/generate_records_data.mjs';
import {
  extractVaultWikilinks,
  loadVaultContentItems,
  parseVaultFrontmatter,
  stripContentExtension,
} from '../../scripts/generate_vault_data.mjs';

export type ExploreNote = {
  id: string;
  slug: string;
  href: string;
  path: string;
  title: string;
  folder: string;
  area: string;
  category: string;
  audience: string;
  intents: string[];
  primaryIntent: string;
  primaryIntentLabel: string;
  status: string;
  tags: string[];
  created: string | null;
  updated: string | null;
  words: number;
  description: string;
  summary: string;
  outgoing: string[];
  recordType: string;
};

export type ExploreData = {
  generated: string;
  metrics: {
    notes: number;
    tags: number;
    links: number;
    hubs: number;
    orphanCandidates: number;
    totalWords: number;
  };
  facets: {
    folders: Array<{ name: string; count: number }>;
    categories: Array<{ name: string; count: number }>;
    audiences: Array<{ name: string; count: number }>;
    intents: Array<{ name: string; label: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    types: Array<{ name: string; count: number }>;
  };
  graph: {
    nodes: Array<{ id: string; title: string; folder: string; tags: string[]; degree: number }>;
    links: Array<{ source: string; target: string }>;
    insights: {
      hubs: Array<{ id: string; title: string; folder: string; degree: number }>;
      orphans: Array<{ id: string; title: string; folder: string }>;
    };
  };
  records: {
    columns: string[];
    rows: Array<{ id: string; type: string | null; cells: Record<string, unknown>; relations: number }>;
  };
  editorial: {
    notesEvaluated: number;
    errorCount: number;
    warningCount: number;
    warnings: string[];
    notices: string[];
    promotionCandidates: Array<{ file: string; title: string; folder: string; category: string; audience: string; words: number }>;
    thinPublishedResources: Array<{ file: string; title: string; folder: string; category: string; audience: string; words: number }>;
    intentDistribution: Array<{ intent: string; label: string; count: number }>;
  };
  notes: ExploreNote[];
};

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

function countWords(content: string): number {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function summarize(content: string): string {
  return content
    .replace(/^# .+$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/[#*_`>\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function increment(map: Map<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key.trim() : 'sem valor';
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function topValues(map: Map<string, number>, limit = 24): Array<{ name: string; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function intentValues(map: Map<string, number>, ia: any): Array<{ name: string; label: string; count: number }> {
  return Object.keys(ia.intents)
    .filter((intent) => map.has(intent))
    .map((intent) => ({
      name: intent,
      label: getIntentLabel(intent, ia),
      count: map.get(intent) ?? 0,
    }));
}

function extractWikiTargets(content: string, related: unknown): string[] {
  const targets = new Set<string>();
  for (const link of extractVaultWikilinks(content)) targets.add(link.target.split('#')[0]?.trim() ?? '');
  for (const item of normalizeList(related)) {
    const relatedLinks = extractVaultWikilinks(item);
    if (!relatedLinks.length) {
      targets.add(item.replace(/^\[\[|\]\]$/g, '').trim());
      continue;
    }
    for (const link of relatedLinks) targets.add(link.target.split('#')[0]?.trim() ?? '');
  }
  return Array.from(targets).filter(Boolean);
}

function folderLabel(folder: string): string {
  return folder.replace(/^\d+\s*-\s*/, '') || folder;
}

function makeSlug(file: string): string {
  return slugify(stripContentExtension(file.replace(/\\/g, '/')));
}

// The Explore graph is derived from records:v1 through the config-driven single source
// (`buildRecordsGraph` over `vault.config.json`), the same projection the records surfaces use —
// notes become records, wikilinks become relations (edges), the PARA folder labels the node.
// This adapter maps Explore notes onto that projection so the graph has one tested origin.
export function buildExploreGraph(
  notes: Array<{ slug: string; title: string; folder: string; tags: string[]; outgoing: string[] }>,
  config: ReturnType<typeof loadRecordsConfig> = loadRecordsConfig(),
): {
  nodes: Array<{ id: string; title: string; folder: string; tags: string[]; degree: number }>;
  links: Array<{ source: string; target: string }>;
} {
  const recordNotes = notes.map((note) => ({
    id: note.slug,
    title: note.title,
    folder: note.folder,
    tags: note.tags,
    links: note.outgoing,
  }));
  return buildRecordsGraph(recordNotes, config);
}

export function buildExploreRecordsTable(
  notes: Array<{ slug: string; title: string; folder: string; status?: string; tags: string[]; outgoing: string[] }>,
  config: ReturnType<typeof loadRecordsConfig> = loadRecordsConfig(),
): {
  columns: string[];
  rows: Array<{ id: string; type: string | null; cells: Record<string, unknown>; relations: number }>;
} {
  const recordNotes = notes.map((note) => ({
    id: note.slug,
    title: note.title,
    folder: note.folder,
    status: note.status,
    tags: note.tags,
    links: note.outgoing,
  }));
  return buildRecordsTable(recordNotes, config);
}

export function buildVaultExploreData({ cwd = process.cwd() } = {}): ExploreData {
  const ia = loadInformationArchitecture(cwd);
  const items = loadVaultContentItems({ cwd });
  const rawNotes = [] as Array<ExploreNote & { aliases: string[]; rawTargets: string[] }>;

  for (const item of items) {
    const normalizedFile = item.path;
    const { data, body } = parseVaultFrontmatter(item.text);
    if (data.status !== vaultStatus.publicState) continue;
    // audience: user-vault = ships published to user vaults but excluded from any site's explore/graph.
    if (data.audience === 'user-vault') continue;

    const slug = makeSlug(normalizedFile);
    const title = data.title ? String(data.title) : basename(stripContentExtension(normalizedFile));
    const folder = normalizedFile.split('/')[0] ?? '';
    const tags = normalizeList(data.tags);
    const categoryKey = normalizeVocabularyValue(typeof data.category === 'string' ? data.category : '', ia.categories) || 'conceito';
    const audienceKey = normalizeVocabularyValue(typeof data.audience === 'string' ? data.audience : '', ia.audiences) || 'todos';
    const intents = deriveNoteIntents({ folder, tags, category: categoryKey }, ia);
    const primaryIntent = intents[0];

    rawNotes.push({
      id: slug,
      slug,
      href: `/${slug}`,
      path: normalizedFile,
      title,
      folder,
      area: folderLabel(folder),
      category: getVocabularyLabel(categoryKey, ia.categories),
      audience: getVocabularyLabel(audienceKey, ia.audiences),
      intents,
      primaryIntent,
      primaryIntentLabel: getIntentLabel(primaryIntent, ia),
      status: String(data.status),
      tags,
      created: normalizeDate(data.created),
      updated: normalizeDate(data.updated),
      words: countWords(body),
      description: typeof data.description === 'string' ? data.description : summarize(body),
      summary: summarize(body),
      outgoing: [],
      recordType: 'Note',
      aliases: normalizeList(data.aliases),
      rawTargets: extractWikiTargets(body, data.related),
    });
  }

  const lookup = new Map<string, string>();
  for (const note of rawNotes) {
    const names = [note.title, basename(stripContentExtension(note.path)), stripContentExtension(note.path), ...note.aliases];
    for (const name of names) {
      lookup.set(name.toLowerCase(), note.slug);
      lookup.set(slugify(name).toLowerCase(), note.slug);
      lookup.set(slugify(`${dirname(note.path)}/${name}`).toLowerCase(), note.slug);
    }
  }

  const links = [] as Array<{ source: string; target: string }>;
  for (const note of rawNotes) {
    const outgoing = new Set<string>();
    for (const target of note.rawTargets) {
      const normalizedTarget = stripContentExtension(target).trim();
      const resolved =
        lookup.get(normalizedTarget.toLowerCase()) ??
        lookup.get(slugify(normalizedTarget).toLowerCase());
      if (resolved && resolved !== note.slug) {
        outgoing.add(resolved);
      }
    }
    note.outgoing = Array.from(outgoing).sort((a, b) => a.localeCompare(b, 'pt'));
    for (const target of note.outgoing) links.push({ source: note.slug, target });
  }

  const notes = rawNotes
    .map(({ aliases: _aliases, rawTargets: _rawTargets, ...note }) => note)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  const recordsTable = buildExploreRecordsTable(notes);
  const recordRowById = new Map(recordsTable.rows.map((row) => [row.id, row]));
  const notesWithRecords = notes.map((note) => ({
    ...note,
    recordType: recordRowById.get(note.slug)?.type ?? 'Note',
  }));

  const folders = new Map<string, number>();
  const categories = new Map<string, number>();
  const audiences = new Map<string, number>();
  const intents = new Map<string, number>();
  const tags = new Map<string, number>();
  const types = new Map<string, number>();
  for (const note of notesWithRecords) {
    increment(folders, note.area);
    increment(categories, note.category);
    increment(audiences, note.audience);
    for (const intent of note.intents) increment(intents, intent);
    for (const tag of note.tags) increment(tags, tag);
    increment(types, note.recordType);
  }

  const graphNodes = buildExploreGraph(notesWithRecords).nodes;
  const hubCandidates = graphNodes.filter((node) => node.degree >= 4);
  const orphanCandidates = graphNodes.filter((node) => node.degree === 0);
  const hubInsights = hubCandidates
    .sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title, 'pt'))
    .slice(0, 12)
    .map(({ id, title, folder, degree }) => ({ id, title, folder, degree }));
  const orphanInsights = orphanCandidates
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'))
    .slice(0, 12)
    .map(({ id, title, folder }) => ({ id, title, folder }));

  const editorialReport = buildInformationArchitectureReport({ root: cwd });

  return {
    generated: new Date().toISOString(),
    metrics: {
      notes: notes.length,
      tags: tags.size,
      links: links.length,
      hubs: hubCandidates.length,
      orphanCandidates: orphanCandidates.length,
      totalWords: notesWithRecords.reduce((sum, note) => sum + note.words, 0),
    },
    facets: {
      folders: topValues(folders),
      categories: topValues(categories),
      audiences: topValues(audiences),
      intents: intentValues(intents, ia),
      tags: topValues(tags),
      types: topValues(types),
    },
    graph: {
      nodes: graphNodes,
      links: links.sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`, 'pt')),
      insights: {
        hubs: hubInsights,
        orphans: orphanInsights,
      },
    },
    records: recordsTable,
    editorial: {
      notesEvaluated: editorialReport.notesEvaluated,
      errorCount: editorialReport.errors.length,
      warningCount: editorialReport.warnings.length,
      warnings: editorialReport.warnings,
      notices: editorialReport.notices,
      promotionCandidates: editorialReport.promotionCandidates,
      thinPublishedResources: editorialReport.thinPublishedResources,
      intentDistribution: editorialReport.intentDistribution,
    },
    notes: notesWithRecords,
  };
}

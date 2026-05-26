import { basename, dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';

const VAULT_FOLDERS = [
  '00 - Entrada',
  '10 - Diário',
  '20 - Projetos',
  '30 - Áreas',
  '40 - Recursos',
  '50 - Arquivo',
  '90 - Modelos',
  '99 - Meta e Anexos',
];

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

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
  status: string;
  tags: string[];
  created: string | null;
  updated: string | null;
  words: number;
  summary: string;
  outgoing: string[];
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
    tags: Array<{ name: string; count: number }>;
  };
  graph: {
    nodes: Array<{ id: string; title: string; folder: string; tags: string[]; degree: number }>;
    links: Array<{ source: string; target: string }>;
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

function extractWikiTargets(content: string, related: unknown): string[] {
  const targets = new Set<string>();
  let match;
  const re = new RegExp(WIKILINK_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    targets.add(match[1].trim());
  }
  for (const item of normalizeList(related)) {
    const relatedMatch = item.match(WIKILINK_RE);
    if (!relatedMatch) {
      targets.add(item.replace(/^\[\[|\]\]$/g, '').trim());
      continue;
    }
    for (const raw of relatedMatch) {
      const inner = raw.replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#')[0].trim();
      if (inner) targets.add(inner);
    }
  }
  return Array.from(targets).filter(Boolean);
}

function folderLabel(folder: string): string {
  return folder.replace(/^\d+\s*-\s*/, '') || folder;
}

function makeSlug(file: string): string {
  return slugify(file.replace(/\\/g, '/').replace(/\.md$/, ''));
}

export function buildVaultExploreData({ cwd = process.cwd() } = {}): ExploreData {
  const files = globSync(VAULT_FOLDERS.map((folder) => `${folder}/**/*.md`), { cwd });
  const rawNotes = [] as Array<ExploreNote & { aliases: string[]; rawTargets: string[] }>;

  for (const file of files) {
    const normalizedFile = file.replace(/\\/g, '/');
    const raw = readFileSync(join(cwd, file), 'utf-8');
    const { data, content } = matter(raw);
    if (data.status !== 'published') continue;

    const slug = makeSlug(normalizedFile);
    const title = data.title ? String(data.title) : basename(file, '.md');
    const folder = normalizedFile.split('/')[0] ?? '';
    const tags = normalizeList(data.tags);

    rawNotes.push({
      id: slug,
      slug,
      href: `/${slug}/`,
      path: normalizedFile,
      title,
      folder,
      area: folderLabel(folder),
      category: typeof data.category === 'string' ? data.category : 'sem categoria',
      audience: typeof data.audience === 'string' ? data.audience : 'todos',
      status: String(data.status),
      tags,
      created: normalizeDate(data.created),
      updated: normalizeDate(data.updated),
      words: countWords(content),
      summary: summarize(content),
      outgoing: [],
      aliases: normalizeList(data.aliases),
      rawTargets: extractWikiTargets(content, data.related),
    });
  }

  const lookup = new Map<string, string>();
  for (const note of rawNotes) {
    const names = [note.title, basename(note.path, '.md'), note.path.replace(/\.md$/, ''), ...note.aliases];
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
      const normalizedTarget = target.replace(/\.md$/, '').trim();
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

  const degree = new Map<string, number>();
  for (const note of rawNotes) degree.set(note.slug, note.outgoing.length);
  for (const link of links) degree.set(link.target, (degree.get(link.target) ?? 0) + 1);

  const folders = new Map<string, number>();
  const categories = new Map<string, number>();
  const audiences = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const note of rawNotes) {
    increment(folders, note.area);
    increment(categories, note.category);
    increment(audiences, note.audience);
    for (const tag of note.tags) increment(tags, tag);
  }

  const notes = rawNotes
    .map(({ aliases: _aliases, rawTargets: _rawTargets, ...note }) => note)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));

  return {
    generated: new Date().toISOString(),
    metrics: {
      notes: notes.length,
      tags: tags.size,
      links: links.length,
      hubs: notes.filter((note) => (degree.get(note.slug) ?? 0) >= 4).length,
      orphanCandidates: notes.filter((note) => (degree.get(note.slug) ?? 0) === 0).length,
      totalWords: notes.reduce((sum, note) => sum + note.words, 0),
    },
    facets: {
      folders: topValues(folders),
      categories: topValues(categories),
      audiences: topValues(audiences),
      tags: topValues(tags),
    },
    graph: {
      nodes: notes.map((note) => ({
        id: note.slug,
        title: note.title,
        folder: note.area,
        tags: note.tags,
        degree: degree.get(note.slug) ?? 0,
      })),
      links: links.sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`, 'pt')),
    },
    notes,
  };
}

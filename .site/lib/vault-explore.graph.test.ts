import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildExploreGraph, buildExploreRecordsTable, buildVaultExploreData } from './vault-explore';
import { loadRecordsConfig } from '../../scripts/generate_records_data.mjs';

// The Explore graph must be derived from the config-driven records:v1 projection (single source),
// so the .site surface and the records surfaces can never drift. This covers that wiring in TS —
// the coverage the migration to Vitest unblocked.

const NOTES = [
  { slug: '20-projetos/launch', title: 'Launch', folder: '20 - Projetos', tags: ['p'], outgoing: ['30-areas/ops'] },
  { slug: '30-areas/ops', title: 'Ops', folder: '30 - Áreas', tags: [], outgoing: [] },
];

test('buildExploreGraph derives the graph from records:v1 (display folder, degree=both, title+tags)', () => {
  const graph = buildExploreGraph(NOTES);

  // PARA folder becomes the display label (number prefix stripped) — the surface convention
  expect(graph.nodes.map((n) => n.folder)).toEqual(['Projetos', 'Áreas']);
  // wikilink → relation → edge
  expect(graph.links).toEqual([{ source: '20-projetos/launch', target: '30-areas/ops' }]);
  // degree = both (outgoing + incoming), from vault.config.json surface.graph
  expect(graph.nodes.find((n) => n.id === '20-projetos/launch')?.degree).toBe(1);
  expect(graph.nodes.find((n) => n.id === '30-areas/ops')?.degree).toBe(1);
  // nodes carry title + tags for the UI/insights
  expect(graph.nodes.find((n) => n.id === '20-projetos/launch')?.title).toBe('Launch');
  expect(graph.nodes.find((n) => n.id === '20-projetos/launch')?.tags).toEqual(['p']);
});

test('buildExploreGraph honors an explicit surface config (subvertible, not hardcoded)', () => {
  // incoming-only degree: the source node stops counting its own outgoing edge
  const config = { ...loadRecordsConfig(), surface: { graph: { labelField: 'folder', degree: 'incoming' } } };
  const graph = buildExploreGraph(NOTES, config);
  expect(graph.nodes.find((n) => n.id === '20-projetos/launch')?.degree).toBe(0);
  expect(graph.nodes.find((n) => n.id === '30-areas/ops')?.degree).toBe(1);
});

test('buildExploreRecordsTable derives table rows from records:v1 without a parallel page', () => {
  const table = buildExploreRecordsTable(NOTES);

  expect(table.columns).toEqual(expect.arrayContaining(['title', 'status', 'tags', 'folder']));
  expect(table.rows.find((row) => row.id === '20-projetos/launch')).toMatchObject({
    id: '20-projetos/launch',
    type: 'Project',
  });
  expect(table.rows.find((row) => row.id === '30-areas/ops')).toMatchObject({
    id: '30-areas/ops',
    type: 'Area',
  });
});

test('buildVaultExploreData keeps Explorar as the MD/MDX content surface', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vault-seed-explore-mdx-'));
  mkdirSync(join(cwd, '.site'), { recursive: true });
  mkdirSync(join(cwd, '00 - Entrada'), { recursive: true });
  mkdirSync(join(cwd, '40 - Recursos'), { recursive: true });
  writeFileSync(
    join(cwd, '.site', 'information-architecture.json'),
    JSON.stringify({
      categories: { conceito: { label: 'Conceito', aliases: [] } },
      audiences: { todos: { label: 'Todos', aliases: [] } },
      intents: { explorar: { label: 'Explorar', folders: ['00 - Entrada', '40 - Recursos'], tags: [], categories: [] } },
    }),
    'utf8',
  );
  writeFileSync(
    join(cwd, '00 - Entrada', 'Nota base.md'),
    '---\ntitle: Nota base\nstatus: published\ncategory: conceito\naudience: todos\nrelated:\n  - "[[Nota MDX]]"\n---\nVeja a nota relacionada.\n',
    'utf8',
  );
  writeFileSync(
    join(cwd, '40 - Recursos', 'Nota MDX.mdx'),
    '---\ntitle: Nota MDX\nstatus: published\ncategory: conceito\naudience: todos\ntags: [mdx]\n---\n<Callout />\n\nConteudo MDX publicado.\n',
    'utf8',
  );

  const explore = buildVaultExploreData({ cwd });

  expect(explore.metrics.notes).toBe(2);
  expect(explore.notes.map((note) => note.path)).toContain('40 - Recursos/Nota MDX.mdx');
  expect(explore.notes.find((note) => note.path.endsWith('.mdx'))?.tags).toEqual(['mdx']);
  expect(explore.graph.links).toHaveLength(1);
  expect(explore.records.rows.find((row) => row.id === 'recursos/nota-mdx')).toMatchObject({ type: 'Resource' });
  expect(explore.notes.find((note) => note.path.endsWith('.mdx'))?.recordType).toBe('Resource');
  expect(explore.facets.types.map((type) => type.name)).toContain('Resource');
  expect(explore.editorial.notesEvaluated).toBe(2);
});

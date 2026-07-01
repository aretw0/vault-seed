import { test, expect } from 'vitest';
import { buildExploreGraph } from './vault-explore';
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

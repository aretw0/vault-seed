# Refarm candidate: records surface blocks

**Status:** PROPOSED - pressure captured, wait for upstream block shape
**Date:** 2026-07-03
**Related:** `2026-06-30-records-view-design.md`,
`2026-07-03-mdx-block-migration-inventory.md`,
`docs/convergencia-refarm-feedback.md`, `.site/pages/explorar/index.astro`,
`.site/components/VaultGraphView.astro`

## Why This Should Move Upstream

The existing `/explorar/` surface is now the canonical records surface. It reads
vault notes through `records:v1` and already avoids a parallel `/records/` app.
The remaining repeated shape is UI, not data modeling:

- facet/filter panels;
- records list/table renderers;
- metrics/insights over record collections;
- graph host, toolbar, and legend;
- content blocks that MDX authors can embed without writing Astro shells.

These blocks are product-neutral enough to help other consumers and the private
POCs. If vault-seed creates a local block package, it becomes a second design
system. The refarm side should cultivate reusable blocks over `@refarm.dev/ds`
and `@refarm.dev/ds-astro`; vault-seed should keep only copy, routes, and
configuration.

## Candidate Blocks

Priority order:

1. `RecordsList` / `RecordsTable`
2. `FacetPanel`
3. `MetricStrip` over record collections
4. `GraphView`
5. `GraphToolbar`
6. `GraphLegend`

The first three unblock requirements-style POCs fastest: a requirement is just a
record type plus fields, so list/table/facets do most of the work without a new
domain surface.

## Input Contract

Blocks should accept `records:v1`-compatible data and render unknown fields
without crashing.

Minimal data expectations:

- record id;
- `@type`;
- `title` or configured label field;
- `fields`;
- `relations`;
- optional grouping/facet config.

The block should not assume PARA names, vault folder labels, route paths, or POC
domain vocabulary.

## Downstream Proof

vault-seed can prove the block candidate with existing surfaces:

- `/explorar/` remains the only route;
- `buildExploreRecordsTable()` derives rows from records;
- type facets work over `@type`;
- graph edges come from `relations`;
- MD/MDX content flows through the same loader.

Current proof files:

- `.site/lib/vault-explore.ts`
- `.site/lib/vault-explore.graph.test.ts`
- `scripts/records_table_surface.test.mjs`
- `scripts/mdx_content_surface_contract.test.mjs`
- `scripts/refarm_ds_astro_consumer_contract.test.mjs`

## Boundary

Refarm owns:

- reusable Astro/MDX blocks over `ds`/`ds-astro`;
- stable props for records/facets/graph rendering;
- accessibility defaults and keyboard/empty/loading states;
- conformance fixtures with generic record data.

vault-seed owns:

- `/explorar/` route shell;
- editorial copy;
- PARA labels, intent vocabulary, and route wiring;
- product-specific graph defaults;
- private POC record types and vocabulary.

## Acceptance Gate

The upstream package should prove:

- a generic `KnowledgeRecord` collection renders as list/table;
- a custom `@type` renders without a code change;
- facets are config-driven;
- graph blocks render relations and tolerate missing/unknown fields;
- MDX import story works through `@refarm.dev/ds-astro` or a successor mapping.

Until that exists, vault-seed should continue with thin route-level glue and
avoid creating a local generic block library.

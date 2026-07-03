# Spec: MDX block migration inventory

**Status:** DRAFT — inventory and boundary guard
**Date:** 2026-07-03
**Related:** `2026-06-30-records-view-design.md`, `docs/convergencia-refarm-feedback.md`,
`@refarm.dev/ds`, `@refarm.dev/content-projection`, future refarm content blocks

## Decision

MDX is the authoring path for content that only lives in `.astro` because Markdown was too limited.
Astro stays for route shells, static data wiring, and interactive hosts. Reusable blocks should come
from refarm; vault-seed packages only narrow product extensions over those blocks.

This inventory prevents two bad outcomes while refarm is not published:

- growing local generic Astro block libraries in vault-seed;
- moving route shells to MDX before the required refarm blocks exist.

## Upstream ask

The next generic block to cultivate in refarm is the MDX render/import layer, not another local
vault-seed component package:

- `@refarm.dev/ds-astro`: sanctioned MDX embed set over `@refarm.dev/ds/html`.
- `mdx-components` mapping or equivalent import story for consumers that render Astro MDX.
- Content blocks with stable, product-neutral props/slots for the surfaces below.

vault-seed should only consume those blocks and provide product wrappers/copy. If a component name below
starts needing reusable props, tests, or docs, that is a refarm supply request; if it only names PARA,
routes, `dgk`, notebook copy, or editorial vocabulary, it stays here.

## Inventory

| Surface | Keep in Astro | Candidate for MDX | Refarm block pressure | Local action before publish |
| --- | --- | --- | --- | --- |
| `.site/pages/index.astro` | Starlight splash shell, graph hero host, homepage data wiring | lead copy, capabilities list, recent-notes section copy, tag section framing | `GraphHero`, `MetricStrip`, `ContentList`, `TagCloud`, `CalloutSection` | Keep shell; extract no local generic block. Document copy sections as MDX-ready. |
| `.site/pages/explorar/index.astro` | route shell, filter JavaScript host, graph host, data endpoint coupling | intro copy, section framing, editorial-card wording | `FacetPanel`, `RecordsList`, `InsightGrid`, `MetricStrip` | Keep local facet wiring over `records:v1`; promote reusable UI pressure to refarm if it grows. |
| `.site/pages/explorar/intencoes.astro` | static projection over `buildVaultExploreData()` | explanation copy and intent-section framing | `IntentMap`, `InsightGrid`, `MetricStrip` | Leave as Astro until intent map block exists; no separate data model. |
| `.site/pages/lab/index.astro` | notebook availability probe and route shell | explanatory copy, notebook/presentation card wording | `NotebookCard`, `AvailabilityBadge`, `CardGrid` | Keep probe local; candidate refarm block only if notebook card generalizes. |
| `.site/components/VaultGraphView.astro` | full interactive SVG graph host | accessible legend text can become prop/slot later | `GraphView`, `GraphToolbar`, `GraphLegend` | Treat as refarm-block pressure, not a local generic package. |
| `.site/components/VaultGraphShared.astro` | shared client runtime for graph physics/labels | none | graph runtime/helper module | Candidate upstream if another surface consumes it. |
| `.site/components/Header.astro`, `Footer.astro`, `PageFrame.astro`, `TwoColumnContent.astro`, `MobileMenuFooter.astro` | Starlight/layout integration | none for now | shell/layout primitives only if another product needs them | Keep local product shell. |

## Promotion rule

A block is promoted to refarm pressure when at least two of these are true:

- it is useful outside vault-seed;
- it has stable data input independent of PARA labels;
- it would otherwise create a local `blocks`, `astro-blocks`, or `content-blocks` package;
- it needs DS/SSR behavior shared with another consumer;
- MDX authors need to use it as a content primitive.

Until then, the vault-seed implementation stays as route-level product glue.

## Near-term queue

1. Keep `/explorar/` as the canonical shell while adding only thin records-driven filters.
2. Allow published `.mdx` files through the same loader as `.md` for markdown-compatible MDX.
3. Convert copy-heavy sections that need JSX/components only after there is a stable block import story.
4. Avoid creating new `.site/components/*` generic blocks unless they are explicitly product shell.
5. Relay reusable block pressure to refarm via `docs/convergencia-refarm-feedback.md`.

## Verification

- `scripts/mdx_content_surface_contract.test.mjs` guards that `/records/` is not introduced and no local
  generic block package appears.
- `.site/content.config.ts` must use the shared `*.md`/`*.mdx` content glob, so published MDX files can
  render when they are markdown-compatible.
- This inventory must mention every `.site/pages/*.astro` page and every reusable component category.
- Refarm feedback must carry the reusable block pressure so upstream can decide what belongs there.

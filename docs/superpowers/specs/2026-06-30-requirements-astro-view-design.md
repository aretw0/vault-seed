# Design: Requirements/Records Astro View (vault-seed product layer)

**Status:** DRAFT — design, no implementation yet
**Date:** 2026-06-30
**Related:** refarm `records:v1` (`@refarm.dev/records-contract-v1`), refarm `@refarm.dev/ds` +
`@refarm.dev/homestead` (astro substrate), refarm `surveyor` (graph data), `.site/` (existing Astro
project), `.site/components/VaultGraphView.astro`, `.site/integrations/generate-vault-json.ts`

> Discretion: neutral vault-product layer. No downstream/domain names or vocabulary; those stay in
> private proofs. This is the astro equivalent of a generic requirements/records model site.

## Context

`.site/` is already an Astro project: it has content collections (`content.config.ts`), a vault JSON
generator (`integrations/generate-vault-json.ts`), explore pages (`pages/explorar/*`), and a graph
view (`components/VaultGraphView.astro`). What it does not have is a surface that renders
**`records:v1`** records — typed records with sections, relations (edges), source refs, and review
state — as a navigable requirements/records view.

Because `records:v1` records *are* graph nodes and relations *are* edges, the existing
`VaultGraphView` is the natural relation renderer; the new surface adds the record/section/review
reading experience around it.

## Boundary (who owns what)

Refarm owns (consumed): `records:v1` (the envelope), `@refarm.dev/ds` (tokens/style),
`@refarm.dev/homestead` (astro surface substrate), `surveyor` (graph traversal/data).

vault-seed owns (this design): the view pages/components, the information architecture, the
record-reading UX, and the records-json integration that feeds the pages.

Private downstream proofs own: domain vocabulary, specific record types/fields, and editorial copy.

## Surface shape

- `integrations/generate-records-json.ts` — reads the `records:v1` manifest (emitted by the ETL
  profiles) and produces a static data file for the pages (mirrors `generate-vault-json.ts`).
- `pages/requisitos/index.astro` — list/index of records, filterable by `@type`, review state, and
  relation; built from DS components.
- `pages/requisitos/[id].astro` — a single record: fields, sections (markdown), source refs (links
  out via `source:v1` ref), review state badge, and relations rendered through `VaultGraphView`
  (the record as a sub-graph).
- reuse `components/{PageFrame,TwoColumnContent,Header,Footer}.astro` and `@refarm.dev/ds` tokens so
  the surface matches the rest of `.site`.

## Data flow

ETL profiles emit `records:v1` manifest → `generate-records-json` (build-time) → astro pages render
records + relations (graph) → published static site. No runtime backend; the manifest is the source
of truth, consistent with the existing static `.site`.

## Forward-compat

The view reads `records:v1` envelopes and MUST tolerate unknown fields and higher `schemaVersion`
(render what it knows, ignore the rest) — the same preserve-unknown posture the contract guarantees.
New record types (`@type`) render generically without a view change.

## Graceful degradation

If no `records:v1` manifest exists (vault has no records yet), the pages render an empty-state, not an
error. If `@refarm.dev/ds` is unavailable in a generated vault, the pages fall back to the existing
`.site` base styles.

## Verification

1. a fixture `records:v1` manifest renders index + detail pages without runtime errors;
2. relations render through `VaultGraphView` as a navigable sub-graph;
3. unknown fields / higher `schemaVersion` records render (preserve-unknown), not crash;
4. empty-state renders with no manifest;
5. the surface uses DS tokens and matches `.site` framing.

## Non-Goals

- No record modeling here (that is `records:v1`); the view only renders.
- No extraction/acquisition here (that is the ETL profiles + `source:v1`).
- No domain vocabulary, editorial governance, or publication copy — downstream.
- No runtime server; the view is static over the manifest, like the rest of `.site`.

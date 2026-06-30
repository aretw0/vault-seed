# Design: Records View (vault-seed product layer)

**Status:** DRAFT — design, no implementation yet
**Date:** 2026-06-30
**Related:** refarm `records:v1` (`@refarm.dev/records-contract-v1`), refarm `@refarm.dev/ds` +
`@refarm.dev/homestead`, refarm `surveyor`, `.site/` (existing Astro project),
`.site/components/VaultGraphView.astro`, `.site/integrations/generate-vault-json.ts`,
`2026-06-30-records-etl-profiles-design.md`

> Discretion: neutral vault-product layer. No downstream/domain names or vocabulary. A
> "requirement" is **one `@type`**, not a special surface — see below.

## Context & the one-off trap

The first instinct — a dedicated `pages/requisitos/*` surface — is the wrong shape: it builds a view
that only works for one record type, while the vault already wants a general way to render structured
records. This design instead makes **`records:v1` the general structured-record rendering**;
requirements are just records whose `@type` is a requirement.

The alignment is already in the vault's grain: a `records:v1` record has `fields` (typed
properties) → those are **table columns**, the same thing Bases/Dataview render over note
frontmatter. So a generic records **table + graph + detail** view *is* the dogfood of the vault's
existing table/graph paradigm, not a parallel feature.

## Surface shape (generic, type-agnostic)

- `integrations/generate-records-json.ts` — reads the `records:v1` manifest (from the ETL profiles)
  into a static data file (mirrors `generate-vault-json.ts`).
- `pages/records/index.astro` — a **table** of records with filters by `@type`, review state, and
  relation. The requirements case is `?type=Requirement`; nothing in the page is requirement-specific.
- `pages/records/[id].astro` — one record: `fields` as a property table, `sections` as markdown,
  `sourceRefs` as out-links, review-state badge, and `relations` rendered through `VaultGraphView`
  (the record as a sub-graph).
- reuse `components/{PageFrame,TwoColumnContent,Header,Footer}.astro` + `@refarm.dev/ds` tokens.

## Convergence (direction, not big-bang)

`records:v1` is the unifying model: PARA notes are already records (frontmatter = `fields`,
wikilinks = `relations`). The existing `.site` surfaces converge onto it incrementally:

- `pages/explorar/*` and `VaultGraphView` adopt `records:v1` as their data substrate where they read
  structured content, so there is one record model behind explore, graph, and table views;
- the `generate-vault-json` projection can emit `records:v1` so existing pages read the same shape;
- migration is **incremental and proven per surface**, not a forced rewrite. The records view ships
  generic from day one so no special case is created; broader convergence follows as each surface is
  proven against the model.

This directly answers the risk of "a thing that only works for requirements": the view is the general
form, and the vault moves *toward* it rather than bolting a silo beside it.

## Forward-compat

The view reads `records:v1` envelopes and tolerates unknown fields and a higher `schemaVersion`
(render what it knows, ignore the rest) — the preserve-unknown posture the contract guarantees. New
`@type`s render generically with no view change.

## Graceful degradation

No manifest → empty state, not an error. `@refarm.dev/ds` unavailable in a generated vault → fall
back to `.site` base styles.

## Boundary

Refarm owns `records:v1`, `ds`/`homestead`, `surveyor` graph data. vault-seed owns the view,
information architecture, and the records-json projection. Private proofs own domain vocabulary and
specific record types.

## Verification

1. a fixture `records:v1` manifest with mixed `@type`s renders the table + a detail page;
2. filtering by `@type`/review/relation works and is not hard-coded to any type;
3. relations render through `VaultGraphView` as a navigable sub-graph;
4. unknown fields / higher `schemaVersion` render (preserve-unknown), not crash;
5. a PARA note projects into the same view as a `records:v1` record (convergence proof, one surface).

## Non-Goals

- No record modeling here (that is `records:v1`); the view renders.
- No extraction/acquisition here (ETL profiles + `source:v1`).
- No forced migration of every existing surface in this design — convergence is incremental.
- No domain vocabulary, editorial governance, or runtime server.

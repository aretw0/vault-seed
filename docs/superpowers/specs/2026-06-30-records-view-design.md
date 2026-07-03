# Design: Records Convergence (vault-seed product layer)

**Status:** DRAFT — design; data layer landed, surface convergence incremental
**Date:** 2026-06-30 (revised: converge existing surfaces, do not add a new page)
**Related:** refarm `records:v1` (`@refarm.dev/records-contract-v1`), `@refarm.dev/ds`, `surveyor`,
`.site/` (existing Astro project), `.site/components/VaultGraphView.astro`,
`.site/lib/vault-explore.ts`, `.site/integrations/generate-vault-json.ts`,
`scripts/generate_records_data.mjs` (the notes→records:v1 projection), `2026-06-30-records-etl-profiles-design.md`

> Discretion: neutral vault-product layer. No downstream/domain names or vocabulary. A
> "requirement" is **one `@type`**, not a special surface.

## Decision: converge, do not add a surface

The vault already renders **notes as a graph** (`pages/explorar/*` + `VaultGraphView` over
`vault-data.json` / `vault-explore`). `records:v1` *is* that model, formalized and refarm-backed: a
PARA note maps cleanly to a `KnowledgeRecord` (folder → `@type`, frontmatter → `fields`, wikilinks →
`relations`), proven by `scripts/generate_records_data.mjs`.

A dedicated `pages/records/*` surface would therefore create **two data models**
(`vault-data.json` *and* a records manifest) and **two surfaces to maintain** — the exact thing we
want to avoid. So this design **converges the existing surfaces onto `records:v1`** instead of adding
a parallel view. This is the ocamento applied to the vault's *own* model: vault content *becomes* the
`records:v1` primitive, one model behind explore, graph, and table views.

## Decision: MDX is the authoring migration path

The long-term migration is not "turn records into another Astro page". It is:

- keep Astro for route shells, data endpoints, and genuinely interactive hosts;
- move authorable content and page sections that only became Astro because Markdown was too limited
  back to MDX;
- consume reusable Astro/SSR blocks from refarm (`ds`, homestead-style render helpers, future content
  blocks) instead of growing generic UI primitives in vault-seed;
- when a block extension is vault-product-specific and does not belong upstream, package it here as a
  narrow extension over refarm primitives, with tests and documentation.

So `/explorar/` stays the canonical surface. MDX expands what can be authored inside the vault; it does
not create a parallel records app.

## Approach — incremental, proven per surface (no big-bang)

The existing surfaces work and are tested; convergence is one surface at a time, each with a test,
never a forced rewrite.

1. **Bridge (done):** `scripts/generate_records_data.mjs` projects vault notes → a validated
   `records:v1` manifest (graceful degradation without `@refarm.dev/*`).
2. **Graph first:** `records:v1` `relations` **are** the graph edges `VaultGraphView` renders. Make
   the graph/explore data read the projected records (nodes = records, edges = relations), proven by
   a test, before touching anything else. This is the cleanest mapping.
3. **Then table/detail:** `fields` are table columns (the Bases/Dataview dogfood); the existing
   explore/table rendering reads records `fields`. Filters by `@type`/review/relation are generic.
4. **Retire duplication:** as each surface reads `records:v1`, the parallel `vault-data.json` shape is
   narrowed toward (or replaced by) the projection, so there is one model, not two.

Each step is additive until proven, then the old path is removed — no surface loses coverage.

## Forward-compat

Converged surfaces read `records:v1` envelopes and tolerate unknown fields / higher `schemaVersion`
(render what they know) — the preserve-unknown posture the contract guarantees. New `@type`s render
generically with no surface change.

## Graceful degradation

Without `@refarm.dev/records-contract-v1`, the projection returns structural records (unvalidated) and
the surfaces render them as today — a generated vault never breaks.

## Boundary

Refarm owns `records:v1`, `ds`, `surveyor` graph traversal, and reusable Astro/SSR/content blocks.
vault-seed owns the surfaces, the information architecture, MDX authoring conventions, and the
notes→records projection. If a UI block is generic, it is refarm pressure/proof. If it is vault-product
specific, vault-seed may package it as a thin extension over refarm primitives. Private proofs own
domain vocabulary and specific record types.

## Verification

1. the notes→records projection emits a valid `records:v1` manifest (done: `generate_records_data.test.mjs`);
2. the graph surface renders records nodes + `relations` edges from the projection (convergence step 2);
3. a PARA note and a fixture `records:v1` record render through the **same** surface (one model);
4. unknown fields / higher `schemaVersion` render (preserve-unknown), not crash;
5. no second data model or parallel page is introduced.
6. content that can be authored as MDX is not trapped in a new Astro-only page.

## Non-Goals

- **No new `pages/records/*` surface** — converge the existing ones (this is the point).
- No generic Astro block library in vault-seed; reusable blocks are upstream refarm candidates.
- No record modeling here (that is `records:v1`); surfaces render.
- No extraction/acquisition here (ETL profiles + `source:v1`).
- No domain vocabulary, editorial governance, or runtime server.

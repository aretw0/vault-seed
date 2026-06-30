# Design: Records ETL Profiles (vault-seed product layer)

**Status:** DRAFT — design, no implementation yet
**Date:** 2026-06-30
**Related:** refarm `source:v1` / `source-web` adapter, refarm `records:v1`
(`@refarm.dev/records-contract-v1`), refarm `enrichment:v1`, refarm `artifact-contract-v1`,
`docs/convergencia-refarm-deps.md`, `packages/cli/src/commands/etl.js`

> Discretion: this is the neutral vault-product layer. No downstream/domain names, sources, or
> vocabulary appear here; those live only in private proofs.

## Context

`dgk etl` runs an ordered, script-based pipeline (`lab_etl_demo`, `prepare_feed_sources`,
`prepare_publication_outbox`, `prepare_lab_datasets`). It works, but each script hard-codes its
source, its transform, and where notes land. There is no declarative profile that says "take *this*
source, extract *these* records, place them *here*". As the ecosystem grows source kinds (git/local/
authenticated web), the ad-hoc scripts do not compose.

This design adds a **profile-driven extraction layer** that consumes the Refarm acquisition/model
contracts and produces structured records, while keeping the vault-specific decisions (PARA
placement, transform bodies, command UX) in the product.

## Boundary (who owns what)

Refarm owns (consumed, not reimplemented):
- `source:v1` — acquiring a stable local snapshot (git/local/`source-web`);
- `records:v1` — the typed record/relation envelope the profile emits;
- `enrichment:v1` — optional augmentation of emitted records;
- `artifact-contract-v1` — provenance of the produced manifest/snapshots.

vault-seed owns (this design):
- the **ETL profile** shape and registry: `{ id, source (source:v1 ref), extract, target }`;
- the **PARA target rules** (which records become which notes, where);
- the transform bodies (the project's extraction logic);
- the `dgk etl` command UX and ordering.

A future Refarm **source-profile contract** may generalize the profile *mechanism*; this design keeps
the profiles vault-local and flags promotion as a later candidate, not a dependency now.

## Profile shape (vault-local)

```jsonc
{
  "id": "feed",                       // profile id (drives `dgk etl --profile feed`)
  "source": { "ref": "<source:v1 ref>" },   // git/local/web — resolved by source:v1
  "extract": { "module": "scripts/profiles/feed.mjs" }, // vault-owned transform → records:v1[]
  "target": { "para": "30 - Areas/Feeds", "review": "draft" } // PARA placement + initial review state
}
```

The transform module receives the materialized snapshot (from `source:v1`) and returns a
`records:v1` manifest. The runner then: (optionally) applies `enrichment:v1` providers, places notes
per `target.para`, and emits an `artifact-contract-v1` manifest recording what was produced.

## Data flow

`dgk etl [--profile <id>]`
→ `source:v1.materialize(profile.source.ref)` (stable snapshot)
→ `profile.extract(snapshot)` → `records:v1` manifest (vault transform)
→ optional `enrichment:v1` over the records
→ place records as notes per `target` (PARA)
→ emit `artifact-contract-v1` provenance manifest.

## Graceful degradation (template-distributed safety)

The ETL scripts ship in generated vaults. They MUST NOT hard-break without the Refarm packages:
- the profile runner imports `@refarm.dev/source-*`/`records-contract-v1` **dynamically**; if absent,
  it falls back to the current direct-script behavior and logs a one-line notice;
- a guard test (sibling to `distributed_scripts_no_static_refarm_import.test.mjs`) asserts no static
  `@refarm.dev/*` import in distributed profile scripts.

## Verification

1. a fixture profile over a `source-local` snapshot emits a valid `records:v1` manifest (conformance);
2. PARA placement is deterministic for the same manifest;
3. an `artifact-contract-v1` manifest records the produced notes + records manifest + any enrichment;
4. degradation: with Refarm packages absent, `dgk etl` still runs the legacy scripts and exits 0;
5. no static `@refarm.dev/*` import in distributed profile scripts.

## Non-Goals

- No source acquisition logic here (that is `source:v1`); profiles only reference a source ref.
- No record envelope definition here (that is `records:v1`); profiles emit it.
- No domain vocabulary or private source — those stay in private proofs.
- No renderer/frontend here — see the requirements astro view design.

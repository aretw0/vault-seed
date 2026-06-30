# Design: Records Composition Proof — Reference Vault (T3 acceptance gate)

**Status:** DRAFT — design, no implementation yet
**Date:** 2026-06-30
**Related:** refarm `source:v1`/`source-web`, `records:v1`, `enrichment:v1`, `artifact-contract-v1`,
`2026-06-30-records-etl-profiles-design.md`, `2026-06-30-records-view-design.md`,
refarm `specs/features/2026-06-30-work-3-requirements-supply-activation.md` (First Proof Shape)

> Discretion: the proof is **sanitized and neutral**. No private target, credentials, selectors, or
> domain vocabulary. The real downstream proof swaps fixtures for private adapters; this reference
> contains none of them.

## Why this exists

It is not enough to specify the blocks; we must **prove they compose** into a working vault "as it
would have been built if the blocks had existed from the start." This reference vault is that proof —
and, more importantly, the early-warning system: **if the mini-vault has to fork or patch any seam to
work, that is a contract gap to fix before the real POC**, not after.

It is also the template for every work's POC: the POC is this reference vault with three fixtures
replaced by real adapters.

## The pipeline (generic blocks only + sanitized fixtures)

```
source:v1 (source-local / replayed source-web)   ← fixture snapshot, no private target
        │  materialize stable snapshot
        ▼
ETL profile (vault-owned transform)              ← fixture profile
        │  emit records:v1 manifest
        ▼
enrichment:v1 (fixture provider)                 ← fixture deterministic map, neutral tags
        │  augment records
        ▼
records:v1 manifest  +  artifact-contract-v1 provenance
        │
        ▼
records view (.site)                             ← generic, type-agnostic
```

Everything in the column is a generic block. The **only** project-specific inputs are three
sanitized fixtures:

1. a **fixture source** — a local snapshot with login/session *evidence shape* but no real target;
2. a **fixture profile/target descriptor** — neutral selectors/placement over the fixture source;
3. a **fixture enrichment provider** — adds neutral tags/fields from bundled deterministic data.

## The guarantee (what "extend only the specific" means, concretely)

The real POC = **swap exactly those three fixtures** for the real adapters (real auth/selectors, real
enrichment provider) and nothing else. If that swap is the only delta, the seams are sufficient and
the POC is de-risked. The reference vault makes that delta visible and small.

## Acceptance criteria

1. the pipeline runs end-to-end from the fixture source to a rendered records view, with **no private
   data** and no network to a real target;
2. each block passes its own conformance (`source:v1`, `records:v1`, `enrichment:v1`, artifact);
3. the proof adds **only** the three fixtures + one vault profile beyond the generic blocks — no
   forked contract, no patched seam;
4. **gap ledger:** any place where a seam had to be worked around is recorded as a contract gap to
   fix upstream (refarm) before the POC — the proof's primary output when it fails;
5. forward-safety holds: a record with an unknown field / higher `schemaVersion` flows through and
   renders.

## Boundary

- The reference vault and its fixtures live in vault-seed (e.g. a `validations/records-reference/`
  slice), sanitized and neutral, safe to show.
- Refarm owns the contracts the proof exercises; the proof is a **consumer** of them and feeds
  consumer-proof evidence back (per the convergence feedback loop).
- The private POC is out of scope here; it reuses this shape with private adapters.

## Verification

1. CI runs the reference pipeline on fixtures and asserts a non-empty records view output;
2. the gap ledger is empty (or its entries are tracked as upstream contract issues);
3. swapping a fixture provider for another fixture provider (not the real one) still passes — proving
   the seam is provider-agnostic;
4. conformance suites for all four contracts pass over the reference inputs.

## Non-Goals

- No real target, credentials, selectors, or domain vocabulary.
- No publishing of a generated vault from the proof.
- No performance/scale claims — the reference is a correctness/composition proof, small by design.

# Records reference vault (T3 composition proof)

The **acceptance gate** for the records pipeline: proof that the generic refarm blocks compose
end-to-end into a records vault — `source-web` (acquire) → `records:v1` (structure) → `enrichment:v1`
(augment) — using **only generic blocks + sanitized fixtures**. No private target, credentials,
selectors, or domain vocabulary.

Structure has **two lanes**, because a vault acquires content two ways:

| lane | acquire | structure |
| --- | --- | --- |
| web | `source-web` over a sanitized snapshot | the local `mkRecord` ETL transform |
| content | a sanitized MD/MDX authoring fixture | `@refarm.dev/content-projection` |

Both land in **one** `records:v1` manifest and are validated together.

- `reference-vault.mjs` — `runReferenceVault()` runs the pipeline and returns a `gaps` ledger.
- `reference-vault.test.mjs` — asserts the pipeline composes with **no seam gaps**, that acquisition
  carries web provenance, that enrichment produces provenanced changes, and that projected content
  records are citizens of the same validated manifest.

## Why it matters

1. **It de-risks the POC.** The real downstream POC is this vault with **exactly its fixtures
   swapped** for private adapters (real auth/selectors, real enrichment lookup). If that swap is the
   only delta, the seams are sufficient.
2. **It surfaces seam gaps early.** If a block has to be forked or patched to compose, it lands in the
   `gaps` ledger — a contract issue to fix upstream (refarm) *before* the POC, not after.

## What the content lane measured

A projected record carries three `content-projection:*` keys a hand-built record does not. Whether
`records:v1` accepts them **beside** an ETL record in one manifest was open until this lane existed —
records projected on their own already validated through `validateProjectedRecords`, which proves
less. Measured 2026-08-16: the manifest validates and the `gaps` ledger stays empty. Enrichment
deliberately runs over the web records only; the reason is written at the call site.

Design: `docs/superpowers/specs/2026-06-30-records-composition-proof-design.md`.

# Records reference vault (T3 composition proof)

The **acceptance gate** for the records pipeline: proof that the generic refarm blocks compose
end-to-end into a records vault — `source-web` (acquire) → `records:v1` (structure) → `enrichment:v1`
(augment) — using **only generic blocks + three sanitized fixtures**. No private target, credentials,
selectors, or domain vocabulary.

- `reference-vault.mjs` — `runReferenceVault()` runs the pipeline and returns a `gaps` ledger.
- `reference-vault.test.mjs` — asserts the pipeline composes with **no seam gaps**, that acquisition
  carries web provenance, and that enrichment produces provenanced changes.

## Why it matters

1. **It de-risks the POC.** The real downstream POC is this vault with **exactly three fixtures
   swapped** for private adapters (real auth/selectors, real enrichment lookup). If that swap is the
   only delta, the seams are sufficient.
2. **It surfaces seam gaps early.** If a block has to be forked or patched to compose, it lands in the
   `gaps` ledger — a contract issue to fix upstream (refarm) *before* the POC, not after.

Design: `docs/superpowers/specs/2026-06-30-records-composition-proof-design.md`.

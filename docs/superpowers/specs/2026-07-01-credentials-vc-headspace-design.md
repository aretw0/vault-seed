# Design: Headspace as a Verifiable-Credentials agent (credentials:v1)

**Status:** Design — approved, pre-plan
**Authors:** Arthur Silva, Claude
**Date:** 2026-07-01
**Related:**
- refarm `specs/features/2026-06-30-credentials-contract-v1.md` (`credentials:v1` — the contract this consumes)
- refarm `specs/ADRs/ADR-079-credentials-verification-policy.md` (the verify-with-policy model this relies on)
- refarm `specs/features/2026-07-01-credentials-verify-policy-revocation.md` (the concrete `verify(input, policy)` + revocation surface)
- vault-seed `scripts/refarm_credentials_consumer_contract.test.mjs` (assimilation + heartwood-signed conformance proof)
- vault-seed `docs/convergencia-refarm-status.md`, `docs/convergencia-refarm-logistica.md`
- `vault.config.json` (the product IaC that will carry the default verification policy)

---

## Context & goal

`credentials:v1` (W3C Verifiable Credentials over `identity:v1` + `storage:v1`, heartwood-backed Ed25519)
is assimilated in vault-seed and its reference provider passes the contract conformance (8/8) with real
signing. This design defines the **product** on top of it: the headspace becomes a full VC **agent** —
it **issues**, **holds/presents**, and **verifies** credentials — while owning none of the cryptography
or the contract, only the experience and the product policy.

This is the vault-seed slice of a two-repo effort. refarm owns the capability (contract, verify policy,
revocation); vault-seed owns the surface. The boundary is explicit below.

## The vault as a VC agent — roles and flows

The vault owner is simultaneously **issuer**, **holder/presenter**, and **verifier**. Three flows, each
mapping to contract methods that already exist (`issue` / `store` / `list` / `present` / `verify`):

1. **Issue** — the owner signs a claim (provenance about one of their own records, or a self-issued
   attestation) → `issue` → `store` in the wallet. The claim is a `VerifiableCredential`.
2. **Present** — the owner selects credential(s) from the wallet → `present` (a holder-signed
   `VerifiablePresentation`) → export/share out of band.
3. **Verify** — the owner receives a VC/VP → the vault checks the **signature** (contract has this) plus
   the **verification policy** (trust, validity, revocation — the refarm gap, see boundary) → a verdict.

## Responsibility boundary (two projects, one capability)

| refarm (capability — owns the contract) | vault-seed (product — owns the experience) |
|---|---|
| `verify(input, policy)` — verification against a declarative `CredentialVerificationPolicy` (ADR-079) | The headspace surfaces: issue / wallet / present / verify |
| Revocation/status mechanism so a policy can require not-revoked | The **default verification policy** as product config (starts as a trust list) |
| *(future)* selective disclosure on presentation | The **seams**: wallet↔`storage:v1`, keys/DID↔`identity-heartwood`, secrets↔`silo` |
| The `credentials:v1` conformance (extended for policy) | Graceful degradation when the stack is absent |

vault-seed introduces **no crypto and no new contract**. If the surface needs something the contract
lacks, it is filed as refarm ADR/feature (as ADR-079 + the verify-policy feature already are) — never
implemented inside the product layer.

## Verification policy — declarative, config-driven, trust-list by default

The vault ships a **default verification policy** in `vault.config.json` (the canonical product IaC),
consumed through the contract's `verify(input, policy)`:

```jsonc
"credentials": {
  "verificationPolicy": {
    "trustSelf": true,         // trust the owner's own DID (resolved dynamically; no hardcoded DID)
    "trustedIssuers": [],      // third-party DIDs the owner adds explicitly
    "revocation": "required",  // check not-revoked via the contract's signed status-list
    "validity": "required"     // reject expired / not-yet-valid
    // future: requiredClaims, holderBinding, trustRegistry
  }
}
```

This object **is** the contract's `CredentialVerificationPolicy` (ADR-079) — it is passed **straight into
`verify(input, policy)` with no translation layer**. A **trust list is the simplest instance** (just
`trustedIssuers`); the policy absorbs everything that grows later (claim constraints, holder binding). The
default seeds **no static DID** — `trustSelf: true` trusts the owner's own DID resolved at verify time (so
self-issued VCs verify out of the box and survive key rotation), and the owner adds third parties
explicitly. The policy is **subvertible**: the user overrides it at the same canonical entry point, like
every other vault opinion.

## Seams (where things live)

- **Wallet (holder-owned VCs)** → `storage:v1` via the provider's `store` / `list`. The wallet is a
  storage collection, not a bespoke store.
- **Keys / DID** → `identity-heartwood` (Ed25519, WASM). The owner's issuer/holder DID comes from the
  identity provider; secrets that must not be exported → `silo`.
- **Verification policy** → `vault.config.json` (product config), loaded and passed to `verify`.

The provider is composed once (`createReferenceCredentialsProvider({ identity, storage })`) behind a
product seam, exactly as the consumer-contract proof already does.

## The three surfaces (UX intent, not layout)

- **Issue** — pick a subject (a record, or a free-form attestation), the vault fills the VC (issuer DID,
  claim, timestamp), signs, and files it in the wallet. Provenance issuance can be one-click from a
  record ("attest this").
- **Wallet** — a list/filter view over `list`, showing each VC's issuer, subject, validity, and
  verification state; export a VC, or select several to present.
- **Verify** — drop in a VC/VP; the vault runs `verify(input, policy)` and shows the verdict with the
  *reason* (signature ok / issuer trusted / not revoked / within validity), so a failure is legible.

## Graceful degradation

Following the ocamento doctrine (`convergencia-refarm-logistica.md`), the headspace uses an **optional
dynamic import** of the credentials stack. Without `@refarm.dev/credentials-contract-v1` (+ identity/
storage), the wallet renders **read-only from any already-stored VCs** and issue/verify are disabled with
an explanatory state — a generated vault never breaks because the sovereign stack is absent.

## Testing / coverage (no manual visual validation)

- **vault-seed:** a round-trip over the seam — issue → store → list → present → verify(policy) — asserting
  the wallet CRUD and that a policy with the issuer in `trustedIssuers` passes while an untrusted issuer or
  a revoked VC fails. This extends the conformance proof already in
  `refarm_credentials_consumer_contract.test.mjs`.
- **Graceful-degradation test:** the headspace path with the stack stubbed out yields the read-only wallet
  and disabled actions.
- The refarm side proves `verify(input, policy)` + revocation via the contract's own conformance (ADR-079
  feature).

## Out of scope / future

- Selective disclosure and zero-knowledge presentation (refarm-side, future).
- A hosted trust registry (the trust list is local config first).
- Cross-vault presentation exchange protocols.
- The specific claim vocabularies the vault issues (a records/vocab decision, tracked with the records
  work, not here).

## Resolved decisions (folded into the design)

- **Config is the verify argument** — the `verificationPolicy` object is structurally the contract's
  `CredentialVerificationPolicy`, passed through with no translation.
- **Self-trust via `trustSelf`, not a seeded DID** — self-issued VCs verify without a hardcoded, rotation-
  fragile entry.
- **Revocation = a signed status-list credential** (W3C Bitstring shape), resolved **locally from
  `storage:v1`** for v1. A future remote status reference resolves **only through an egress allowlist**
  (peerd egress-chokepoint lesson) — the vault never fetches an arbitrary status URL.

## Open questions for the plan

1. Wallet collection shape in `storage:v1` (one collection vs partitioned by issuer/subject) — a product
   ergonomics call for the plan.
2. Whether the headspace exposes `trustSelf` as a visible toggle or keeps it an implicit default.

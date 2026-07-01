# Design: `vault.config.json` as the canonical vault manifest

**Status:** Design — approved, pre-plan
**Authors:** Arthur Silva, Claude
**Date:** 2026-07-01
**Related:**
- `vault.config.json` (today: `license`, `kudos`, `records`; `credentials.verificationPolicy` from the T2 design)
- `.site/lib/vault-config.mjs` (the loader), `vault-folders.json`, `.site/information-architecture.json`, `sidebar.sections.json` (the fragmented configs to consolidate)
- `docs/superpowers/specs/2026-07-01-credentials-vc-headspace-design.md` (a config-driven consumer)
- refarm `@refarm.dev/config` (`config-node` — the *future* primitive for exposing this config to an agent; not the manifest mechanism)

---

## Context & goal

Product opinions are fragmented across four config files (`vault.config.json`, `vault-folders.json`,
`.site/information-architecture.json`, `sidebar.sections.json`) and, worse, **hardcoded**: the status
lifecycle (`status !== 'published'`, `?? "draft"`) appears literally in `vault-explore.ts`,
`information-architecture-audit.mjs`, `generate_records_data.mjs`, and `prepare_publication_outbox.mjs`.
The "product opinion" boundary is implicit and un-auditable, and subverting the vault means editing code
plus several files.

**Goal:** every product opinion has an intentional home in **one canonical, schema'd, subvertible
manifest**; the code reads only from it; the user overrides at a single canonical entry point. This
realizes the config-driven-IaC direction the records/graph/credentials sections already follow.

## The manifest — one logical view, storage is an implementation detail

The manifest balances a single canonical source (A) with editing ergonomics (B) by separating the
**logical** manifest from its **physical** storage:

- **The loader (`vault-config.mjs`) resolves one merged manifest.** Consumers call `loadVaultConfig()` and
  receive the whole thing — they never know how it was stored.
- **Core semantics inline; bulky lists opt into `$ref`.** Status lifecycle, records, credentials, and
  folder *roles* live inline in `vault.config.json`. Volume-heavy sections (the folder list, the vocab
  dictionaries) MAY be `{ "$ref": "vault-folders.json" }`, resolved by the loader — so big lists stay in
  focused, editable files without fragmenting the logical manifest.
- **One schema, one override point.** A single JSON schema validates the resolved manifest; the loader
  applies **layered merge** (product defaults ← user overrides) at the canonical entry.

The vault owner decides per-section whether to inline or reference; the default is core-inline +
lists-referenced.

## Sections

| Section | State | Source it canonicalizes |
|---|---|---|
| `license`, `kudos` | present | — |
| `records` | present | — |
| `credentials.verificationPolicy` | designed (T2) | — |
| **`status`** | **new** | the hardcoded `'published'`/`'draft'` lifecycle |
| **`folders`** | consolidate | `vault-folders.json` + the hardcoded `'90 - Modelos'` exclusion |
| **`vocab`** | consolidate | `.site/information-architecture.json` (categories/audiences/intents) |

`status` shape (canonicalizing the scattered checks):

```jsonc
"status": {
  "states": ["draft", "published"],  // the lifecycle the vault recognizes
  "publicState": "published"          // the state that gates site visibility
}
```

`folders` carries PARA + **roles**, so "which folder is templates / excluded from the public site" is a
declared opinion, not a hardcoded string.

## Loader, schema, drift guard

- **Loader** — `vault-config.mjs` resolves `$ref`, applies the override layer, returns the merged manifest.
- **Schema** — a JSON schema for the resolved manifest; a validation test fails on a malformed config.
- **Drift guard** — a test/CI check that opinions are not re-hardcoded: it forbids literal PARA folder
  names and status strings (`'published'`/`'draft'`) outside the config and the loader. This is the
  "everything exists intentionally, from config" enforcement — the same discipline as the
  distributed-scripts and no-raw-child-process guards already in the suite.

## Incremental migration (no big-bang)

One section at a time, each behind the loader, each with a test, none breaking the build:

1. **`status` first** — the clearest gap. Route the `!== 'published'` reads through
   `config.status.publicState`. Add the drift guard for status strings.
2. **`folders`** — fold `vault-folders.json` in via `$ref`, add roles, replace the `'90 - Modelos'`
   literal with a role.
3. **`vocab`** — consolidate `information-architecture.json`, likely via `$ref`.

Each step keeps its existing tests green and adds a config-driven assertion.

## refarm relationship (confirmed with fact)

The manifest is **vault-seed product responsibility** — refarm is not required for it.

- `@refarm.dev/config/astro` is refarm's **internal astro build aliases** (resolving its own packages),
  **not** a reusable vault-config loader — not consumed here.
- `@refarm.dev/config` `config-node` (redaction/evidence) is the **future** primitive for exposing this
  manifest **to an agent/farmhand** with secrets redacted (e.g., credential keys) — relevant when the
  vault config becomes something an agent reads, not for the manifest mechanism itself.
- The generic **load → merge → resolve `$ref` → validate** mechanism stays **vault-seed-local**, and is
  flagged as a **candidate refarm block** if a second consumer emerges (the codemod pattern).

## Testing / coverage

- Schema validation test over the resolved manifest.
- The drift guard (no re-hardcoded opinions).
- Each migrated section keeps its prior tests green plus a config-driven assertion (e.g., changing
  `publicState` in a fixture config changes which notes are considered public).

## Out of scope / future

- Exposing the manifest as a redacted `config-node` to an agent (consumes the refarm primitive later).
- A schema-driven config editor/UX.
- Folding `sidebar.sections.json` (a build artifact) — evaluated in the plan, not assumed.

## Open questions for the plan

1. `$ref` convention: a JSON-Schema-style `$ref` vs a simpler explicit `include` key — pick one and guard it.
2. Whether `vocab` inlines or stays `$ref` (size vs one-file canonicality).
3. Override-layer source: a sibling `vault.config.local.json`, an env var, or a documented in-file block.

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

1. **`status`** — ✅ landed (increments 1 + 1b, commits `65c94c0`/`18795a5`). `config.status.publicState`
   + a `vaultStatus` loader export; all seven render + tooling/smoke gates routed off the hardcoded
   `'published'`; drift guard covers the whole git-tracked tree.
2. **`folders`** — ✅ fully landed. Role (increment 2, `adf6b8f`): `config.folders.excludeFromPublic`
   drives `PUBLISHED_VAULT_FOLDERS`. List (increment 2b, `3a1085e`): `config.folders.list` `$ref`s
   `.site/vault-folders.json`, exposed as `vaultFolders.all`; `VAULT_FOLDERS` derives from it (one source).
3. **`vocab`** — ✅ landed (increment 3, `ebee228`). `config.vocab` `$ref`s
   `.site/information-architecture.json`, exposed as `vaultVocab`. This increment added the **`$ref`
   resolver** in the loader — the reusable reference mechanism (folders' list uses it too).

All three planned sections are migrated; each keeps its tests green and adds a config-driven assertion.

Remaining (future): a neutral loader location — CJS/scripts reach the loader via `.site/lib/vault-config.mjs`
(a mild reverse coupling; the loader reads from `process.cwd()`, which is the repo root in every current
context but is a robustness edge). A JSON-pointer `$ref` (`#/folders`) would also let a section reference a
sub-path of a file. Both are polish, not blockers.

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

## Resolved decisions (folded from review)

1. **`$ref` for references** — the recognized convention (OpenAPI/JSON-Ref). No conflict with JSON-Schema's
   own `$ref`: the schema validates the *resolved* manifest, so the validator never sees a raw `$ref`.
   Resolution is relative to the manifest file.
2. **`folders` and `vocab` are `$ref`'d; core stays inline** — both are the bulky lists the balance
   references; status, records, credentials, and folder roles stay inline. The loader preserves logical
   canonicality.
3. **Override layer = a gitignored sibling `vault.config.local.json`**, merged over the committed
   `vault.config.json`. This separates product defaults (committed, template-updatable) from user overrides
   (local, surviving template updates without conflict) — essential for a template. An env-var layer is a
   possible future secondary for deploy-time overrides.

# Refarm candidate: records profile runner

**Status:** PROPOSED - downstream proof exists, upstream candidate
**Date:** 2026-07-03
**Related:** `2026-06-30-records-etl-profiles-design.md`,
`docs/convergencia-refarm-feedback.md`, `scripts/vault_records_profile.mjs`,
`scripts/records_etl.mjs`

## Why This Should Move Upstream

vault-seed already composes the neutral chain:

```text
source snapshot -> records:v1 -> enrichment:v1 -> artifact-contract-v1
```

The current scripts prove the contracts compose, but the runner mechanics are not
vault-specific anymore. Keeping the mechanism here means every POC or downstream
consumer must reassemble the same orchestration: source materialization, record
validation, optional enrichment, report/artifact emission, and graceful
degradation.

The generic primitive belongs in refarm. vault-seed should keep only profiles,
transforms, PARA placement, vocabulary, and command UX.

## Candidate Surface

Working name: `@refarm.dev/profile-runner` or a subpath under the existing
records/source stack.

Minimal programmatic shape:

```ts
type ProfileRunnerInput = {
  profile: {
    id: string;
    source: unknown;
    transform: (snapshot: unknown) => Promise<unknown[]> | unknown[];
    enrichment?: unknown;
    artifact?: unknown;
  };
  providers: {
    source?: unknown;
    records?: unknown;
    enrichment?: unknown;
    artifacts?: unknown;
  };
};

type ProfileRunnerReport = {
  ok: boolean;
  profileId: string;
  recordCount: number;
  enrichedCount: number;
  artifact?: unknown;
  failures: unknown[];
};
```

The exact types should come from refarm contracts, not from this sketch. The
important part is the boundary: the runner owns orchestration and report shape;
the downstream owns transforms and policy.

## Downstream Proof Already Available

vault-seed can serve as the acceptance fixture:

- `scripts/vault_records_profile.mjs`
- `scripts/vault_records_profile.test.mjs`
- `scripts/records_etl.mjs`
- `scripts/records_etl.test.mjs`
- `scripts/refarm_artifact_consumer_contract.test.mjs`

Current real-vault proof:

```powershell
pnpm run records:profile
pnpm run artifacts:manifest
```

Expected behavior: 93 records validated and a `records-profile-report` artifact
included when the report exists.

## Boundary

Refarm owns:

- profile runner orchestration;
- typed report envelope;
- composition of `source:v1`, `records:v1`, `enrichment:v1`, and
  `artifact-contract-v1`;
- conformance fixture proving success, failure, and preserve-unknown behavior.

vault-seed owns:

- vault profile definitions;
- transforms from vault content into records;
- PARA placement and review workflow;
- private POC source/lookup adapters and vocabulary;
- `dgk` command copy and operator UX.

## Acceptance Gate

The candidate should not publish until it proves:

- a fixture profile emits valid `records:v1`;
- enrichment is optional and idempotent;
- failures are reported without crashing the host;
- artifact emission is stable and optional;
- a downstream can inject private providers without forking the runner.

When refarm emits the package in `vault-seed-ready`, vault-seed should replace
the local runner mechanics with a thin adapter and keep the existing product
profiles.

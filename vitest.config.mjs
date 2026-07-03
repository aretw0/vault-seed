// Aligns vault-seed's test stack with refarm (Vitest), so TypeScript logic (e.g. the `.site`
// records/graph layer) is testable alongside the JS/MJS suite. The node:test suite migrates to
// Vitest via the refarm `node:test → vitest` codemod. Bounded workers keep the shared devcontainer
// safe (see docs/convergencia-refarm-logistica.md and refarm ADR-078 ceilings).
export default {
  test: {
    include: [
      "scripts/**/*.test.{js,mjs,cjs,ts}",
      "packages/**/*.test.{js,mjs,cjs,ts}",
      "validations/**/*.test.{js,mjs,ts}",
      ".site/**/*.test.{js,mjs,ts}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "packages/cli/vendor/**"],
    // Serial (maxWorkers: 1): several contract/smoke tests read many repo files, and under concurrency
    // (either pool, on Windows) a read intermittently failed — a transient FS contention, not a test
    // bug (each file passes in isolation). Running one file at a time is effectively that isolation, so
    // the suite is deterministic. The cost is wall-clock; the win is a trustworthy gate.
    pool: "forks",
    maxWorkers: 1,
  },
};

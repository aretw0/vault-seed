import { defineConfig } from "vitest/config";

// Aligns vault-seed's test stack with refarm (Vitest), so TypeScript logic (e.g. the `.site`
// records/graph layer) is testable alongside the JS/MJS suite. The node:test suite migrates to
// Vitest via the refarm `node:test → vitest` codemod. Bounded workers keep the shared devcontainer
// safe (see docs/convergencia-refarm-logistica.md and refarm ADR-078 ceilings).
export default defineConfig({
  test: {
    include: [
      "scripts/**/*.test.{js,mjs,cjs,ts}",
      "packages/**/*.test.{js,mjs,cjs,ts}",
      "validations/**/*.test.{js,mjs,ts}",
      ".site/**/*.test.{js,mjs,ts}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "packages/cli/vendor/**"],
    pool: "forks",
    maxWorkers: 4,
  },
});

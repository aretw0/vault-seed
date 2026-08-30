// Own config: run from this package, the root vitest.config.mjs globs
// (scripts/**, packages/**) resolve against packages/cli and match nothing,
// so `pnpm --filter @aretw0/dgk-cli test` exited 1 with "No test files found".
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.{js,mjs,cjs,ts}"],
    exclude: ["**/node_modules/**", "**/dist/**", "vendor/**"],
  },
});

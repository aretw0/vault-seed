import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const MIGRATED = [
  "packages/dgk-runner/src/index.js",
  "packages/cli/src/launcher.js",
  "packages/cli/src/obsidian.js",
  "packages/cli/src/commands/vscode.js",
  "packages/cli/src/commands/serve.js",
  "packages/cli/src/commands/setup.js",
];

test("nenhum import cru de node:child_process nos arquivos migrados", () => {
  for (const p of MIGRATED) {
    expect(read(p), `${p} ainda importa node:child_process`).not.toMatch(/from ['"](node:)?child_process['"]/);
  }
});

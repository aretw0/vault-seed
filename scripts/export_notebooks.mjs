#!/usr/bin/env node
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { uvEnv } from "./uv_env.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = join(ROOT, ".site", "lab.notebooks.json");
const notebooksPath = process.env.VAULT_NOTEBOOKS_PATH || "lab";
const outDir = join(ROOT, "dist", notebooksPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

mkdirSync(outDir, { recursive: true });

for (const notebook of manifest.filter((entry) => entry.publish)) {
  const source = join(ROOT, notebook.source);
  const output = join(outDir, notebook.output);
  mkdirSync(dirname(output), { recursive: true });
  console.log(`export notebook: ${notebook.source} -> dist/${notebooksPath}/${notebook.output}`);
  const result = spawnSync("uv", [
    "run",
    "--with-requirements",
    "requirements.txt",
    "marimo",
    "export",
    "html-wasm",
    source,
    "--output",
    output,
  ], {
    cwd: ROOT,
    env: uvEnv(),
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`[notebooks:export] não foi possível iniciar o uv/Marimo: ${result.error.message}`);
    console.error("[notebooks:export] instale uv e rode novamente: https://docs.astral.sh/uv/getting-started/installation/");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

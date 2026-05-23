#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { uvEnv } from "./uv_env.mjs";

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const url = urlIndex >= 0 ? args[urlIndex + 1] : process.env.MARIMO_URL;

if (!url) {
  console.log("Uso: pnpm run notebooks:pair -- --url URL_DO_MARIMO [--codex|--claude|--opencode]");
  console.log("");
  console.log("1. Rode pnpm run notebooks:dev.");
  console.log("2. Abra um notebook no Marimo e copie a URL da sessão.");
  console.log("3. Rode este comando com a URL para gerar o prompt de pareamento.");
  process.exit(1);
}

const passthrough = args.filter((arg, index) => {
  if (arg === "--url") return false;
  if (index === urlIndex + 1) return false;
  return true;
});
const result = spawnSync(
  "uv",
  ["run", "--no-project", "--with-requirements", "requirements.txt", "marimo", "pair", "prompt", "--url", url, ...passthrough],
  {
    cwd: process.cwd(),
    env: uvEnv(),
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`[notebooks:pair] não foi possível iniciar uv/Marimo: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);

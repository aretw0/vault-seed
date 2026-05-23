#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeVaultData } from "./generate_vault_data.mjs";
import { uvEnv } from "./uv_env.mjs";

const NOTEBOOKS_DIR = "99 - Meta e Anexos/Notebooks";

function run(label, args) {
  console.log(`[notebooks:check] ${label}`);
  const result = spawnSync("uv", ["run", "--with-requirements", "requirements.txt", "marimo", ...args], {
    cwd: process.cwd(),
    env: uvEnv(),
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[notebooks:check] não foi possível iniciar uv/Marimo: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const { data } = writeVaultData();
console.log(`[notebooks:data] ${data.noteCount} notas`);

run("estrutura e formatação", ["check", NOTEBOOKS_DIR, "--strict", "--ignore-scripts"]);
run("execução de sessão", ["export", "session", NOTEBOOKS_DIR, "--force-overwrite", "--no-continue-on-error"]);

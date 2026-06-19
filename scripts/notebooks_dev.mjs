#!/usr/bin/env node
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { globSync } from "glob";
import { writeVaultData } from "./generate_vault_data.mjs";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";
import { ensureLabDatasetSnapshots } from "./ensure_lab_snapshots.mjs";
import { uvEnv } from "./uv_env.mjs";

const NOTEBOOKS_DIR = "99 - Meta e Anexos/Notebooks";
const VAULT_PATTERNS = [
  "00 - Entrada/**/*.md",
  "10 - Diário/**/*.md",
  "20 - Projetos/**/*.md",
  "30 - Áreas/**/*.md",
  "40 - Recursos/**/*.md",
  "50 - Arquivo/**/*.md",
  "90 - Modelos/**/*.md",
  "99 - Meta e Anexos/**/*.md",
];

function snapshot() {
  return globSync(VAULT_PATTERNS, { cwd: process.cwd() })
    .map((file) => {
      try {
        return `${file}:${statSync(file).mtimeMs}`;
      } catch {
        return `${file}:missing`;
      }
    })
    .sort()
    .join("\n");
}

function refresh(reason) {
  const { data } = writeVaultData();
  ensureLabDatasetSnapshots();
  const { data: datasetData } = buildLabDatasets();
  console.log(`[notebooks:data] ${data.noteCount} notas (${reason})`);
  console.log(`[notebooks:etl] ${datasetData.datasetCount} dataset(s) (${reason})`);
}

refresh("inicial");
let lastSnapshot = snapshot();
const interval = setInterval(() => {
  const nextSnapshot = snapshot();
  if (nextSnapshot === lastSnapshot) return;
  lastSnapshot = nextSnapshot;
  refresh("mudança no vault");
}, 2000);

const port = process.env.MARIMO_PORT || "2718";
const child = spawn("uv", ["run", "--no-project", "--with-requirements", "requirements.txt", "marimo", "--yes", "edit", NOTEBOOKS_DIR, "--port", port, "--watch"], {
  env: uvEnv(),
  stdio: "inherit",
});

child.on("error", (error) => {
  clearInterval(interval);
  console.error(`[notebooks:dev] não foi possível iniciar o uv/Marimo: ${error.message}`);
  console.error("[notebooks:dev] instale uv e rode novamente: https://docs.astral.sh/uv/getting-started/installation/");
  process.exit(1);
});

function stop(signal) {
  clearInterval(interval);
  if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code, signal) => {
  clearInterval(interval);
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

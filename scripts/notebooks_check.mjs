#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { globSync } from "glob";
import { writeVaultData } from "./generate_vault_data.mjs";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";
import { resolveNotebooksPath } from "./notebook_path.mjs";
import { uvEnv } from "./uv_env.mjs";

const NOTEBOOKS_DIR = "99 - Meta e Anexos/Notebooks";
const NOTEBOOKS_PATH = resolveNotebooksPath();

function run(label, args) {
  console.log(`[notebooks:check] ${label}`);
  const result = spawnSync("uv", ["run", "--no-project", "--with-requirements", "requirements.txt", "marimo", ...args], {
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
const { data: datasetData } = buildLabDatasets();
console.log(`[notebooks:etl] ${datasetData.datasetCount} dataset(s)`);

run("estrutura e formatação", ["check", NOTEBOOKS_DIR, "--strict", "--ignore-scripts"]);
run("execução de sessão", ["export", "session", NOTEBOOKS_DIR, "--force-overwrite", "--no-continue-on-error"]);

const mojibakeFiles = globSync([
  `public/${NOTEBOOKS_PATH}/vault-data.json`,
  "99 - Meta e Anexos/Notebooks/**/__marimo__/session/*.json",
])
  .filter((file) => /(?:\\u00c3|Ã)/.test(readFileSync(file, "utf8")));

if (mojibakeFiles.length > 0) {
  console.error("[notebooks:check] possível mojibake UTF-8 encontrado:");
  for (const file of mojibakeFiles) console.error(`- ${file}`);
  process.exit(1);
}

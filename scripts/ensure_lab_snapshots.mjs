#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest } from "./prepare_lab_datasets.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function pnpmCommand() {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm run notebooks:etl"],
    };
  }
  return {
    command: "pnpm",
    args: ["run", "notebooks:etl"],
  };
}

export function missingLabDatasetSources({ cwd = ROOT, manifest = readManifest() } = {}) {
  return manifest
    .filter((entry) => entry.publish !== false && entry.source)
    .map((entry) => String(entry.source))
    .filter((source) => !existsSync(join(cwd, source)));
}

export function ensureLabDatasetSnapshots({ cwd = ROOT, manifest = readManifest() } = {}) {
  const missing = missingLabDatasetSources({ cwd, manifest });
  if (missing.length === 0) {
    return false;
  }

  if (process.env.VAULT_LAB_ETL_PREPARING === "1") {
    throw new Error(
      `[notebooks:etl] snapshots ausentes apos preparar ETL: ${missing.join(", ")}`,
    );
  }

  console.log(
    `[notebooks:etl] preparando snapshots ausentes: ${missing.join(", ")}`,
  );
  const command = pnpmCommand();
  const result = spawnSync(command.command, command.args, {
    cwd,
    env: {
      ...process.env,
      VAULT_LAB_ETL_PREPARING: "1",
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(
      `[notebooks:etl] nao foi possivel iniciar pnpm: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `[notebooks:etl] preparacao de snapshots falhou com codigo ${result.status ?? 1}`,
    );
  }

  const stillMissing = missingLabDatasetSources({ cwd, manifest });
  if (stillMissing.length > 0) {
    throw new Error(
      `[notebooks:etl] snapshots continuaram ausentes: ${stillMissing.join(", ")}`,
    );
  }

  return true;
}

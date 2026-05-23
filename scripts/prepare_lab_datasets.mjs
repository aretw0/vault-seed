#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST_PATH = join(ROOT, ".site", "lab.datasets.json");
const notebooksPath = process.env.VAULT_NOTEBOOKS_PATH || "lab";
const outputRoot = process.env.VAULT_NOTEBOOKS_OUTPUT_DIR || join(ROOT, "public");
const outDir = join(outputRoot, notebooksPath);
const DATASET_ROOT = "datasets";

function normalizeRelPath(value, label) {
  const normalized = String(value ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0") || normalized.split("/").includes("..")) {
    throw new Error(`${label} inválido: ${value}`);
  }
  return normalized;
}

function assertInsideRoot(root, path, label) {
  const rel = relative(root, path).replace(/\\/g, "/");
  if (rel === "" || rel.startsWith("../") || rel === "..") {
    throw new Error(`${label} precisa estar dentro do repositório: ${path}`);
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return [];
  }
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(".site/lab.datasets.json precisa ser um array.");
  }
  return parsed;
}

function datasetOutput(entry) {
  if (entry.output) {
    return normalizeRelPath(entry.output, `output do dataset ${entry.id}`);
  }
  if (entry.source) {
    return normalizeRelPath(basename(entry.source), `output do dataset ${entry.id}`);
  }
  throw new Error(`dataset ${entry.id} precisa de output quando não copia um arquivo local.`);
}

export function buildLabDatasets({ cwd = ROOT, manifest = readManifest(), targetRoot = outDir } = {}) {
  const seen = new Set();
  const datasets = [];

  for (const entry of manifest.filter((item) => item.publish !== false)) {
    const id = String(entry.id ?? "").trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error(`dataset id inválido: ${entry.id}`);
    }
    if (seen.has(id)) {
      throw new Error(`dataset id duplicado: ${id}`);
    }
    seen.add(id);

    const output = datasetOutput(entry);
    const record = {
      id,
      title: String(entry.title ?? id),
      description: entry.description ? String(entry.description) : "",
      format: entry.format ? String(entry.format) : output.split(".").pop(),
      output,
    };

    if (entry.source) {
      const source = join(cwd, normalizeRelPath(entry.source, `source do dataset ${id}`));
      assertInsideRoot(cwd, source, `source do dataset ${id}`);
      if (!existsSync(source)) {
        throw new Error(`dataset ${id} aponta para arquivo inexistente: ${entry.source}`);
      }
      const stats = statSync(source);
      if (!stats.isFile()) {
        throw new Error(`dataset ${id} precisa apontar para um arquivo: ${entry.source}`);
      }

      const targets = [
        join(targetRoot, DATASET_ROOT, output),
        join(targetRoot, "assets", DATASET_ROOT, output),
      ];
      for (const target of targets) {
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(source, target);
      }

      record.kind = "snapshot";
      record.path = `${DATASET_ROOT}/${output}`;
      record.assetPath = `${DATASET_ROOT}/${output}`;
      record.bytes = stats.size;
      record.sha256 = sha256(source);
    } else if (entry.runtimeUrl) {
      const runtimeUrl = String(entry.runtimeUrl);
      if (!/^https?:\/\//.test(runtimeUrl)) {
        throw new Error(`runtimeUrl do dataset ${id} precisa ser http(s).`);
      }
      record.kind = "runtime";
      record.url = runtimeUrl;
    } else {
      throw new Error(`dataset ${id} precisa de source ou runtimeUrl.`);
    }

    datasets.push(record);
  }

  datasets.sort((a, b) => a.id.localeCompare(b.id, "pt"));
  const data = {
    generated: new Date().toISOString(),
    datasetCount: datasets.length,
    datasets,
  };

  const manifestTargets = [
    join(targetRoot, DATASET_ROOT, "manifest.json"),
    join(targetRoot, "assets", DATASET_ROOT, "manifest.json"),
  ];
  for (const target of manifestTargets) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(data, null, 2), "utf8");
  }

  return { data, outDir: targetRoot };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { data, outDir } = buildLabDatasets();
  console.log(`lab datasets: ${data.datasetCount} dataset(s) preparados em ${outDir}`);
}

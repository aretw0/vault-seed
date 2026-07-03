#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OUTPUT = join(ROOT, ".dgk", "task-artifacts.json");
const SCHEMA = "refarm.task-artifacts.v1";

async function loadArtifactContract() {
  try {
    return await import("@refarm.dev/artifact-contract-v1");
  } catch {
    return null;
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function toRepoUri(cwd, path) {
  return relative(cwd, path).replaceAll("\\", "/");
}

function artifactForFile({ cwd, path, id, role, labels, producer, command, createdAt }) {
  return {
    id,
    uri: toRepoUri(cwd, path),
    mediaType: "application/json",
    role,
    reviewState: "accepted",
    hash: { algorithm: "sha256", value: sha256(path) },
    provenance: {
      runId: "vault-seed-artifact-manifest",
      producer,
      command,
      process: {
        command: "node",
        args: ["scripts/generate_task_artifacts_manifest.mjs"],
        display: command,
        cwd,
        packageManager: "pnpm",
      },
      source: "vault-seed",
      sourceVersion: "local-checkout",
      producedAt: createdAt,
    },
    labels,
  };
}

export function buildTaskArtifactsManifest({
  cwd = ROOT,
  now = new Date().toISOString(),
  contract = null,
} = {}) {
  const producer = "vault-seed:artifacts";
  const command = "node scripts/generate_task_artifacts_manifest.mjs";
  const candidates = [
    {
      id: "lab-datasets-manifest",
      path: join(cwd, "public", "lab", "datasets", "manifest.json"),
      role: "manifest",
      labels: ["lab", "dataset"],
    },
    {
      id: "publication-outbox",
      path: join(cwd, ".dgk", "outbox-publicacao.json"),
      role: "manifest",
      labels: ["publication", "outbox"],
    },
    {
      id: "records-manifest",
      path: join(cwd, "dist", "records-manifest.json"),
      role: "manifest",
      labels: ["records", "site"],
    },
    {
      id: "records-profile-report",
      path: join(cwd, ".dgk", "records-profile-report.json"),
      role: "report",
      labels: ["records", "etl", "profile"],
    },
  ];

  const artifacts = candidates
    .filter((candidate) => existsSync(candidate.path))
    .map((candidate) =>
      artifactForFile({
        cwd,
        path: candidate.path,
        id: candidate.id,
        role: candidate.role,
        labels: candidate.labels,
        producer,
        command,
        createdAt: now,
      }),
    );

  const manifest = {
    schema: contract?.TASK_ARTIFACT_MANIFEST_SCHEMA ?? SCHEMA,
    taskId: "vault-seed-artifact-proof",
    createdAt: now,
    artifacts,
  };

  if (contract?.validateTaskArtifactManifest) {
    const result = contract.validateTaskArtifactManifest(manifest);
    if (!result.ok) {
      throw new Error(
        `task artifact manifest is invalid: ${JSON.stringify(result.issues)}`,
      );
    }
  }

  return manifest;
}

export async function writeTaskArtifactsManifest({
  cwd = ROOT,
  outputPath = DEFAULT_OUTPUT,
  now,
  contract,
} = {}) {
  const loadedContract = contract ?? (await loadArtifactContract());
  const manifest = buildTaskArtifactsManifest({ cwd, now, contract: loadedContract });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { data: manifest, outputPath, validated: Boolean(loadedContract) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { data, outputPath, validated } = await writeTaskArtifactsManifest();
  const state = validated ? "validated" : "unvalidated";
  console.log(`task artifacts: ${data.artifacts.length} artifact(s) [${state}] -> ${outputPath}`);
}

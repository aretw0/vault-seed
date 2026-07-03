import { test, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import {
  TASK_ARTIFACT_MANIFEST_SCHEMA,
  selectTaskArtifacts,
  validateTaskArtifactManifest,
} from "@refarm.dev/artifact-contract-v1";
import { buildTaskArtifactsManifest } from "./generate_task_artifacts_manifest.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/artifact-contract-v1";
const TGZ = "file:vendor/refarm.dev-artifact-contract-v1-0.1.0.tgz";

test("vault-seed pins @refarm.dev/artifact-contract-v1 via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe(TGZ);
});

test("the consumed artifact:v1 surface is exported", () => {
  const dts = readFileSync(join(ROOT, "node_modules", PKG, "dist", "index.d.ts"), "utf8");
  for (const name of [
    "TASK_ARTIFACT_MANIFEST_SCHEMA",
    "validateTaskArtifactManifest",
    "isTaskArtifactManifest",
    "selectTaskArtifacts",
    "findTaskArtifactById",
    "TaskArtifactManifest",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

test("vault-seed maps Lab, outbox, and records outputs to a valid task artifact manifest", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vault-seed-artifacts-"));
  mkdirSync(join(cwd, "public", "lab", "datasets"), { recursive: true });
  mkdirSync(join(cwd, ".dgk"), { recursive: true });
  mkdirSync(join(cwd, "dist"), { recursive: true });
  writeFileSync(join(cwd, "public", "lab", "datasets", "manifest.json"), '{"datasetCount":1}\n');
  writeFileSync(join(cwd, ".dgk", "outbox-publicacao.json"), '{"itemCount":1}\n');
  writeFileSync(join(cwd, ".dgk", "records-profile-report.json"), '{"recordCount":1}\n');
  writeFileSync(join(cwd, "dist", "records-manifest.json"), '{"records":[]}\n');

  const manifest = buildTaskArtifactsManifest({
    cwd,
    now: "2026-07-03T00:00:00.000Z",
    contract: { TASK_ARTIFACT_MANIFEST_SCHEMA, validateTaskArtifactManifest },
  });

  expect(validateTaskArtifactManifest(manifest).ok).toBe(true);
  expect(manifest.artifacts.map((artifact) => artifact.id)).toEqual([
    "lab-datasets-manifest",
    "publication-outbox",
    "records-manifest",
    "records-profile-report",
  ]);
  expect(selectTaskArtifacts(manifest, { labels: ["publication"] })).toHaveLength(1);
  expect(selectTaskArtifacts(manifest, { labels: ["profile"] })).toHaveLength(1);
  expect(selectTaskArtifacts(manifest, { labels: ["lab"] })[0].uri).toBe("public/lab/datasets/manifest.json");
});

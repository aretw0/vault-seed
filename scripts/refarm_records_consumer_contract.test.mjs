import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import * as recordsYaml from "@refarm.dev/records-contract-v1/yaml";
import { noteToRecord, loadRecordsConfig } from "./generate_records_data.mjs";

// vault-seed consumes @refarm.dev/records-contract-v1 (records:v1) as the structured
// record model for the records view + ETL. This pins the tarball and the consumed surface.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/records-contract-v1";
const TGZ = "file:vendor/refarm.dev-records-contract-v1-0.1.0.tgz";

test("vault-seed pins @refarm.dev/records-contract-v1 via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe(TGZ);
});

test("the consumed records:v1 surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = ["index", "types", "conformance", "reference"]
    .map((f) => readFileSync(join(base, `${f}.d.ts`), "utf8"))
    .join("\n");
  for (const name of [
    "RECORDS_CAPABILITY",
    "CURRENT_RECORD_SCHEMA_VERSION",
    "KnowledgeRecord",
    "RecordRelation",
    "RecordsManifest",
    "RecordsProvider",
    "runRecordsV1Conformance",
    "computeRecordContentHash",
    "createReferenceRecordsProvider",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

test("the ./yaml codec surface is exported (records:v1 <-> YAML-LD)", () => {
  const dts = readFileSync(join(ROOT, "node_modules", PKG, "dist", "yaml.d.ts"), "utf8");
  for (const name of [
    "recordFromYamlLdObject",
    "recordToYamlLdObject",
    "parseRecordsYamlLd",
    "stringifyRecordsYamlLd",
    "parseRecordsYamlLdFrontMatter",
    "stringifyRecordsYamlLdFrontMatter",
    "RecordsYamlLdPropertyKeyMap",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

// Second-consumer adoption proof for the YAML-LD codec: it must round-trip vault-seed's own
// records:v1 projection. vault-seed stops owning a bespoke YAML-LD normalizer and consumes the
// refarm codec instead — the vault's frontmatter IS the record's serialization.
test("the yaml codec round-trips + completes a vault-seed records:v1 record", () => {
  const config = loadRecordsConfig();
  const note = {
    id: "20-projetos/launch",
    title: "Launch",
    folder: "20 - Projetos",
    status: "active",
    tags: ["p"],
    links: ["30-areas/ops"],
  };
  const lean = noteToRecord(note, config);

  // The codec completes the lean projection on parse — it stamps schemaVersion + contentHash,
  // preserving every semantic field (forward-safe).
  const completed = recordsYaml.recordFromYamlLdObject(recordsYaml.recordToYamlLdObject(lean));
  expect(completed.id).toBe(lean.id);
  expect(completed["@type"]).toEqual(lean["@type"]);
  expect(completed["@context"]).toBe(lean["@context"]);
  expect(completed.fields).toEqual(lean.fields);
  expect(completed.relations).toEqual(lean.relations);
  expect(completed.schemaVersion).toBeGreaterThanOrEqual(1);
  expect(completed.contentHash).toMatch(/^fnv1a32:/);

  // Idempotent on a complete record — true object round-trip fidelity.
  expect(recordsYaml.recordFromYamlLdObject(recordsYaml.recordToYamlLdObject(completed))).toEqual(completed);

  // Front matter bridge: record -> vault note (YAML-LD frontmatter) -> { record, body }.
  const md = recordsYaml.stringifyRecordsYamlLdFrontMatter(completed, "corpo da nota");
  const parsed = recordsYaml.parseRecordsYamlLdFrontMatter(md);
  expect(parsed.record).toEqual(completed);
  expect(parsed.body.trim()).toBe("corpo da nota");
});

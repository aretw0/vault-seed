#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createKeyLookupEnrichmentProvider } from "./enrichment_key_lookup.mjs";
import { buildRecordsManifest } from "./generate_records_manifest.mjs";
import { runRecordsProfile } from "./records_etl.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OUTPUT = join(ROOT, ".dgk", "records-profile-report.json");

function defaultProfileConfig() {
  return {
    id: "vault-default",
    source: { kind: "vault-records-manifest", artifact: "records-manifest.json" },
    transform: { kind: "identity-records", input: "records:v1[]" },
    enrichment: { optional: true },
    target: { artifact: ".dgk/records-profile-report.json", review: "draft" },
  };
}

function createEnrichmentProvider(enrichment = null) {
  if (!enrichment) return null;
  if (enrichment.provider) return enrichment.provider;
  if (!enrichment.keyField || typeof enrichment.lookup !== "function") return null;
  return createKeyLookupEnrichmentProvider({
    keyField: enrichment.keyField,
    lookup: enrichment.lookup,
    providerId: enrichment.providerId ?? "vault-records-profile-key-lookup",
    at: enrichment.at,
  });
}

function profileSummary({ profile, sourceOut, etlOut }) {
  const enrichmentDiagnostics = etlOut.enriched?.diagnostics ?? null;
  return {
    schema: "vault.records-profile.report.v1",
    profile,
    source: {
      generated: sourceOut.generated ?? null,
      degraded: Boolean(sourceOut.degraded),
      recordCount: sourceOut.records?.length ?? 0,
      validationOk: sourceOut.validation?.ok ?? null,
    },
    result: {
      degraded: Boolean(etlOut.degraded),
      recordCount: etlOut.records.length,
      manifestVersion: etlOut.manifest?.manifestVersion ?? null,
      validationOk: etlOut.validation?.ok ?? null,
      validationFailures: etlOut.validation?.failures?.length ?? 0,
      enrichment: enrichmentDiagnostics
        ? {
            total: enrichmentDiagnostics.total,
            enriched: enrichmentDiagnostics.enriched,
            skipped: enrichmentDiagnostics.skipped,
            byCode: enrichmentDiagnostics.byCode ?? {},
          }
        : null,
    },
  };
}

/**
 * Run the vault-local records profile.
 *
 * This is product glue, not a new capability: source acquisition, records
 * validation, and enrichment semantics stay in Refarm packages. The seams here
 * are the source function and lookup provider that private POCs can replace.
 */
export async function runVaultRecordsProfile({
  cwd = ROOT,
  source = buildRecordsManifest,
  enrichment = null,
  profile = defaultProfileConfig(),
} = {}, deps = {}) {
  const sourceOut = await source({ cwd });
  const enrichmentProvider = createEnrichmentProvider(enrichment);
  const etlOut = await runRecordsProfile(
    {
      snapshot: sourceOut,
      transform: (snapshot) => snapshot.records ?? [],
      enrichmentProvider,
    },
    deps,
  );

  return profileSummary({ profile, sourceOut, etlOut });
}

export async function writeVaultRecordsProfileReport({
  cwd = ROOT,
  outputPath = DEFAULT_OUTPUT,
  ...opts
} = {}, deps = {}) {
  const report = await runVaultRecordsProfile({ cwd, ...opts }, deps);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { data: report, outputPath };
}

function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  const { data, outputPath } = await writeVaultRecordsProfileReport();
  const state = data.result.validationOk === false ? "invalid" : "ok";
  console.log(
    `records profile: ${data.result.recordCount} records [${state}] -> ${outputPath}`,
  );
  if (data.result.validationOk === false) process.exitCode = 1;
}

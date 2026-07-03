import { test, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SEARCH_ROOTS = ["scripts", "packages"];

// Product seams that intentionally adapt vault-seed data into refarm contracts.
// These stay local because they encode PARA, dgk, notebook, publication, or demo
// behavior rather than defining a reusable capability.
const ALLOWED = new Set([
  "scripts/enrichment_key_lookup.mjs",
  "scripts/enrichment_key_lookup.test.mjs",
  "scripts/generate_records_data.mjs",
  "scripts/generate_records_data.test.mjs",
  "scripts/generate_records_manifest.mjs",
  "scripts/generate_records_manifest.test.mjs",
  "scripts/generate_task_artifacts_manifest.mjs",
  "scripts/refarm_artifact_consumer_contract.test.mjs",
  "scripts/refarm_channel_policy_consumer_contract.test.mjs",
  "scripts/refarm_content_projection_consumer_contract.test.mjs",
  "scripts/refarm_credentials_consumer_contract.test.mjs",
  "scripts/refarm_ds_consumer_contract.test.mjs",
  "scripts/refarm_ds_html_consumer_contract.test.mjs",
  "scripts/refarm_enrichment_consumer_contract.test.mjs",
  "scripts/refarm_process_handoff_consumer_contract.test.mjs",
  "scripts/refarm_quality_consumer_contract.test.mjs",
  "scripts/refarm_records_consumer_contract.test.mjs",
  "scripts/refarm_source_web_consumer_contract.test.mjs",
  "scripts/records_etl.mjs",
  "scripts/records_etl.test.mjs",
  "scripts/records_table_surface.test.mjs",
]);

const IGNORED_DIRS = new Set(["node_modules", "dist", "public", ".git"]);
const CODE_EXT = /\.(mjs|cjs|js|ts)$/;

// High-signal filenames that would mean vault-seed is growing a generic refarm
// primitive instead of adapting one. Keep this narrow: ordinary product modules
// should not trip it.
const FORBIDDEN_FILE_RE = /(?:^|\/)(?:source|records|enrichment|quality|artifact|channel|credentials|identity|storage|process)-(?:contract|provider|adapter|conformance|validator|capability)(?:\.|-)/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(ROOT, abs).replaceAll("\\", "/");
    const stats = statSync(abs);
    if (stats.isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) out.push(...walk(abs));
      continue;
    }
    if (CODE_EXT.test(entry)) out.push(rel);
  }
  return out;
}

test("vault-seed must not grow generic refarm capability implementations locally", () => {
  const files = SEARCH_ROOTS.flatMap((root) => walk(join(ROOT, root)));
  const offenders = files.filter((file) => FORBIDDEN_FILE_RE.test(file) && !ALLOWED.has(file));

  expect(
    offenders,
    [
      "Potential refarm primitive reimplementation found.",
      "If this is product glue, add a narrow allowlist entry with a comment.",
      "If it is reusable capability code, move/spec it in refarm and keep vault-seed as the consumer.",
      `Offenders: ${offenders.join(", ")}`,
    ].join(" "),
  ).toEqual([]);
});

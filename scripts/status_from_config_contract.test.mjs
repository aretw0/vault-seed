import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards that vault-seed's product opinions come from vault.config.json (see
// docs/superpowers/specs/2026-07-01-vault-config-manifest-design.md), never hardcoded. Each guard scans
// git-tracked source (race-proof) for the anti-pattern and allows only the loader that holds the default.
const ROOT = process.cwd();
const LOADER = ".site/lib/vault-config.mjs";
const SELF = "status_from_config_contract.test.mjs";

function offenders(pattern, allowed) {
  const tracked = execFileSync("git", ["ls-files", "-z", "*.ts", "*.mjs", "*.js", "*.astro"], { cwd: ROOT })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const out = [];
  for (const rel of tracked) {
    const norm = rel.replaceAll("\\", "/");
    if (allowed.has(norm) || norm.endsWith(SELF)) continue;
    if (pattern.test(readFileSync(join(ROOT, rel), "utf8"))) out.push(norm);
  }
  return out;
}

// --- status.publicState (manifest increments 1 + 1b) ---
const HARDCODED_STATUS_GATE = /\bstatus\b[^\n;]{0,24}[!=]==?\s*['"]published['"]/;

test("visibility is gated on status.publicState, not a hardcoded 'published'", () => {
  const bad = offenders(HARDCODED_STATUS_GATE, new Set([LOADER]));
  expect(bad, `hardcoded status gate — use vaultStatus.publicState: ${bad.join(", ")}`).toEqual([]);
});

test("vaultStatus is sourced from vault.config.json", async () => {
  const { vaultStatus } = await import("../.site/lib/vault-config.mjs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  expect(vaultStatus.publicState).toBe(cfg.status.publicState);
  expect(vaultStatus.states).toEqual(cfg.status.states);
});

// --- folders.excludeFromPublic (manifest increment 2) ---
const HARDCODED_FOLDER_EXCLUDE = /[!=]==?\s*['"]90 - Modelos['"]/;

test("the public-site folder exclusion comes from folders.excludeFromPublic, not a hardcoded name", () => {
  const bad = offenders(HARDCODED_FOLDER_EXCLUDE, new Set([LOADER]));
  expect(bad, `hardcoded folder exclusion — use vaultFolders.excludeFromPublic: ${bad.join(", ")}`).toEqual([]);
});

test("vaultFolders.excludeFromPublic is sourced from vault.config.json", async () => {
  const { vaultFolders } = await import("../.site/lib/vault-config.mjs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  expect(vaultFolders.excludeFromPublic).toEqual(cfg.folders.excludeFromPublic);
});

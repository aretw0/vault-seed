import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Increment 1 of the vault.config.json manifest migration (see
// docs/superpowers/specs/2026-07-01-vault-config-manifest-design.md): site visibility is gated on the
// canonical `status.publicState`, never a hardcoded 'published'. This guard forbids re-hardcoding that
// comparison — the loader `.site/lib/vault-config.mjs` holds the sole default.
const ROOT = process.cwd();
// The loader holds the sole default; the `.site` render layer is migrated (increment 1).
const ALLOWED = new Set([".site/lib/vault-config.mjs"]);
// Increment 1b cleared the baseline: audit_sidebar + the smoke scripts now read status.publicState too
// (via vaultStatus / a direct config read). Nothing pending — the guard covers the whole tracked tree.
const KNOWN_PENDING = new Set([]);
// A note-status field compared to the literal public-state string — the visibility-gate anti-pattern.
const HARDCODED_STATUS_GATE = /\bstatus\b[^\n;]{0,24}[!=]==?\s*['"]published['"]/;

test("the .site render layer gates visibility on status.publicState, not a hardcoded 'published'", () => {
  const tracked = execFileSync("git", ["ls-files", "-z", "*.ts", "*.mjs", "*.js", "*.astro"], { cwd: ROOT })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const offenders = [];
  for (const rel of tracked) {
    const norm = rel.replaceAll("\\", "/");
    if (ALLOWED.has(norm) || KNOWN_PENDING.has(norm)) continue;
    if (norm.endsWith("status_from_config_contract.test.mjs")) continue; // this guard holds the pattern
    if (HARDCODED_STATUS_GATE.test(readFileSync(join(ROOT, rel), "utf8"))) offenders.push(norm);
  }
  expect(offenders, `hardcoded status gate — use vaultStatus.publicState: ${offenders.join(", ")}`).toEqual([]);
});

test("vaultStatus is sourced from vault.config.json (config-driven, not hardcoded)", async () => {
  const { vaultStatus } = await import("../.site/lib/vault-config.mjs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  expect(vaultStatus.publicState).toBe(cfg.status.publicState);
  expect(vaultStatus.states).toEqual(cfg.status.states);
});

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

test("vaultFolders.all resolves the folder-list $ref to .site/vault-folders.json", async () => {
  const { vaultFolders } = await import("../.site/lib/vault-config.mjs");
  const list = JSON.parse(readFileSync(join(ROOT, ".site/vault-folders.json"), "utf8"));
  expect(vaultFolders.all).toEqual(list.folders);
  expect(vaultFolders.all.length).toBeGreaterThan(0); // non-empty — VAULT_FOLDERS depends on it
});

// --- vocab via $ref (manifest increment 3): the loader resolves the reference to the focused file ---
test("vaultVocab resolves the $ref in vault.config.json to the vocabulary file", async () => {
  const { vaultVocab } = await import("../.site/lib/vault-config.mjs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  // vault.config.json holds a $ref; the resolved value carries the real vocabulary.
  expect(cfg.vocab).toHaveProperty("$ref");
  const ia = JSON.parse(readFileSync(join(ROOT, cfg.vocab.$ref), "utf8"));
  expect(Object.keys(vaultVocab).sort()).toEqual(["audiences", "categories", "intents"]);
  expect(vaultVocab.categories).toEqual(ia.categories);
});

// --- credentials.verificationPolicy (T2/headspace): product policy is config, not crypto code ---
test("vaultCredentials.verificationPolicy is sourced from vault.config.json", async () => {
  const { vaultCredentials } = await import("../.site/lib/vault-config.mjs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  expect(vaultCredentials.verificationPolicy).toEqual(cfg.credentials.verificationPolicy);
  expect(vaultCredentials.verificationPolicy).toMatchObject({
    trustSelf: true,
    trustedIssuers: [],
    revocation: "required",
    validity: "required",
  });
});

// --- manifest shape (the "schema" half of the design's schema + drift-guard) ---
test("vault.config.json conforms to the manifest shape", () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));

  // status: a set of states with one designated public state that is a member of the set
  expect(Array.isArray(cfg.status?.states), "status.states must be an array").toBe(true);
  expect(typeof cfg.status?.publicState, "status.publicState must be a string").toBe("string");
  expect(cfg.status.states, "publicState must be one of states").toContain(cfg.status.publicState);

  // folders: an exclusion role + the list referenced via $ref
  expect(Array.isArray(cfg.folders?.excludeFromPublic), "folders.excludeFromPublic must be an array").toBe(true);
  expect(cfg.folders?.list, "folders.list must be a $ref").toHaveProperty("$ref");

  // vocab: referenced via $ref
  expect(cfg.vocab, "vocab must be a $ref").toHaveProperty("$ref");

  // records: a context base + a default type + a folder->type map
  expect(typeof cfg.records?.context?.base, "records.context.base must be a string").toBe("string");
  expect(typeof cfg.records?.defaultType, "records.defaultType must be a string").toBe("string");
  expect(typeof cfg.records?.typeByFolder, "records.typeByFolder must be an object").toBe("object");

  // credentials: product-owned verification policy, passed straight through to credentials:v1
  expect(typeof cfg.credentials?.verificationPolicy, "credentials.verificationPolicy must be an object").toBe("object");
  expect(typeof cfg.credentials.verificationPolicy.trustSelf, "credentials.verificationPolicy.trustSelf must be boolean").toBe("boolean");
  expect(Array.isArray(cfg.credentials.verificationPolicy.trustedIssuers), "trustedIssuers must be an array").toBe(true);
  expect(["required", "optional", "disabled"], "revocation must be a known policy mode").toContain(
    cfg.credentials.verificationPolicy.revocation,
  );
  expect(["required", "optional", "disabled"], "validity must be a known policy mode").toContain(
    cfg.credentials.verificationPolicy.validity,
  );
});

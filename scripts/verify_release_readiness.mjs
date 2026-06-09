#!/usr/bin/env node
/**
 * Verifica de forma determinística se o repositório está pronto para publicar releases.
 * Roda localmente; não faz parte do `validate` (não vai com o usuário).
 *
 * Uso:
 *   node scripts/verify_release_readiness.mjs
 *   node scripts/verify_release_readiness.mjs --json
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const JSON_MODE = process.argv.includes("--json");

function rootJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function gh(args) {
  const result = spawnSync("gh", args.split(" "), { encoding: "utf8", cwd: ROOT });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return result.stdout.trim() || null;
  }
}

function checkNpmToken() {
  const secrets = gh("secret list --json name");
  if (!secrets) return { ok: false, detail: "gh secret list failed — not authenticated?" };
  const found = Array.isArray(secrets) && secrets.some((s) => s.name === "NPM_TOKEN");
  return { ok: found, detail: found ? "NPM_TOKEN secret present" : "NPM_TOKEN secret missing" };
}

function checkPypiEnvironment() {
  const envs = gh("api repos/{owner}/{repo}/environments");
  if (!envs) return { ok: false, detail: "Could not read environments" };
  const names = (envs.environments ?? []).map((e) => e.name);
  const found = names.includes("pypi");
  return {
    ok: found,
    detail: found
      ? "'pypi' environment configured"
      : `'pypi' environment missing — found: ${names.join(", ") || "none"}`,
  };
}

function checkPypiPackagePublished() {
  const result = spawnSync(
    "node",
    ["-e", `
      const https = require('https');
      https.get('https://pypi.org/pypi/dgk-lab-runtime/json', r => {
        process.exit(r.statusCode === 200 ? 0 : 1);
      }).on('error', () => process.exit(1));
    `],
    { encoding: "utf8", timeout: 8000 },
  );
  if (result.status === 0) {
    return { ok: true, detail: "dgk-lab-runtime already published on PyPI" };
  }
  return {
    ok: false,
    detail: "dgk-lab-runtime not yet on PyPI — first publish requires trusted publisher registration at pypi.org/manage/account/publishing/",
    blocking: false,
  };
}

function checkPendingChangesets() {
  const csDir = join(ROOT, ".changeset");
  if (!existsSync(csDir)) return { ok: false, detail: "No .changeset directory" };
  const files = readdirSync(csDir).filter((f) => f.endsWith(".md") && f !== "README.md");
  if (files.length === 0) {
    return { ok: false, detail: "No pending changesets — run 'pnpm changeset' first" };
  }
  return { ok: true, detail: `${files.length} changeset(s) pending: ${files.join(", ")}` };
}

function checkRootVersion() {
  const { version } = rootJson("package.json");
  if (version === "0.0.1") {
    return {
      ok: false,
      detail: `package.json version is '0.0.1' (stale placeholder) — restore last published version`,
    };
  }
  return { ok: true, detail: `package.json version: ${version}` };
}

function checkChangesetStatus() {
  const result = spawnSync("pnpm", ["changeset", "status"], {
    encoding: "utf8",
    cwd: ROOT,
    shell: process.platform === "win32",
  });
  const output = result.stdout + result.stderr;
  if (result.status !== 0 && !output.includes("Packages to be bumped")) {
    return { ok: false, detail: "changeset status failed" };
  }
  const lines = output
    .split("\n")
    .filter((l) => l.includes("Packages to be bumped") || l.includes("- @") || l.includes("- digital"))
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim())
    .filter(Boolean);
  return { ok: true, detail: lines.join(" | ") };
}

function checkLastMainCI() {
  const runs = gh("run list --branch main --limit 5 --json name,conclusion,status");
  if (!runs) return { ok: false, detail: "Could not check CI runs" };
  const relevant = runs.filter(
    (r) => r.name === "Template CI" || r.name === "Vault CI (User)",
  );
  const allGreen = relevant.every((r) => r.conclusion === "success");
  const summary = relevant
    .map((r) => `${r.name}: ${r.conclusion ?? r.status}`)
    .join(", ");
  return { ok: allGreen, detail: summary || "No relevant CI runs found" };
}

const checks = [
  ["npm-token", checkNpmToken],
  ["pypi-env", checkPypiEnvironment],
  ["pypi-published", checkPypiPackagePublished],
  ["changesets", checkPendingChangesets],
  ["root-version", checkRootVersion],
  ["changeset-status", checkChangesetStatus],
  ["main-ci", checkLastMainCI],
];

const results = {};
for (const [name, fn] of checks) {
  try {
    results[name] = fn();
  } catch (err) {
    results[name] = { ok: false, detail: `Error: ${err.message}` };
  }
}

const blocking = Object.entries(results).filter(
  ([, r]) => !r.ok && r.blocking !== false,
);
const warnings = Object.entries(results).filter(
  ([, r]) => !r.ok && r.blocking === false,
);
const passing = Object.entries(results).filter(([, r]) => r.ok);

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: blocking.length === 0, results }, null, 2));
} else {
  console.log("\nRelease Readiness Check\n");
  for (const [name, r] of Object.entries(results)) {
    const icon = r.ok ? "✅" : r.blocking === false ? "⚠️ " : "❌";
    console.log(`  ${icon}  ${name.padEnd(20)} ${r.detail}`);
  }
  console.log();
  if (blocking.length === 0 && warnings.length === 0) {
    console.log("Ready to release.\n");
  } else {
    if (blocking.length > 0) {
      console.log(`❌ ${blocking.length} blocking issue(s):`);
      for (const [name, r] of blocking) console.log(`   ${name}: ${r.detail}`);
    }
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} warning(s) (non-blocking):`);
      for (const [name, r] of warnings) console.log(`   ${name}: ${r.detail}`);
    }
    console.log();
  }
}

process.exit(blocking.length > 0 ? 1 : 0);

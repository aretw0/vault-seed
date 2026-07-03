#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REFARM_SCOPE = "@refarm.dev/";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readYaml(path) {
  return YAML.parse(readFileSync(path, "utf8"));
}

function parseArgs(argv) {
  const args = {
    root: ROOT,
    json: false,
    planOnly: false,
    probeNpm: false,
    assumeVersion: null,
    versionsPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--plan-only") args.planOnly = true;
    else if (arg === "--probe-npm") args.probeNpm = true;
    else if (arg === "--root") args.root = resolve(argv[++i]);
    else if (arg === "--assume-version") args.assumeVersion = argv[++i];
    else if (arg === "--versions") args.versionsPath = resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function collectRefarmFileSpecs(pkg, workspace) {
  const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const direct = [];
  for (const section of sections) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      if (name.startsWith(REFARM_SCOPE) && String(spec).startsWith("file:")) {
        direct.push({ name, section, spec: String(spec), targetSpec: null });
      }
    }
  }

  const overrides = [];
  for (const [name, spec] of Object.entries(workspace?.overrides ?? {})) {
    if (name.startsWith(REFARM_SCOPE) && String(spec).startsWith("file:")) {
      overrides.push({ name, spec: String(spec), action: "remove-after-publish" });
    }
  }

  const names = [...new Set([...direct.map((item) => item.name), ...overrides.map((item) => item.name)])].sort();
  return { direct, overrides, names };
}

function loadVersionMap({ root, assumeVersion, versionsPath }) {
  const versions = {};
  if (assumeVersion) return { defaultVersion: assumeVersion, versions };
  if (!versionsPath) return { defaultVersion: null, versions };

  const loaded = readJson(resolve(root, versionsPath));
  for (const [name, version] of Object.entries(loaded)) {
    versions[name] = String(version).replace(/^\^/, "");
  }
  return { defaultVersion: null, versions };
}

function probeNpmVersions(names) {
  const versions = {};
  const errors = {};
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  for (const name of names) {
    const result = spawnSync(npmCmd, ["view", name, "version", "--json"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) {
      const raw = result.stdout.trim();
      try {
        const parsed = JSON.parse(raw);
        versions[name] = Array.isArray(parsed) ? parsed.at(-1) : String(parsed);
      } catch {
        versions[name] = raw.replace(/^"|"$/g, "");
      }
    } else {
      errors[name] = (result.stderr || result.stdout || `npm view exited ${result.status}`).trim();
    }
  }

  return { versions, errors };
}

function collectManifestPackageNames(manifest) {
  return (manifest?.packages ?? [])
    .map((item) => item?.packageName)
    .filter((name) => typeof name === "string" && name.startsWith(REFARM_SCOPE))
    .sort();
}

export function buildPublicationPlan({
  pkg,
  workspace,
  manifest = null,
  versionMap = {},
  defaultVersion = null,
  probeErrors = {},
  planOnly = false,
}) {
  const collected = collectRefarmFileSpecs(pkg, workspace);
  const manifestPackageNames = collectManifestPackageNames(manifest);
  const referencedNames = new Set(collected.names);
  const manifestNames = new Set(manifestPackageNames);
  const vendorOnlyPackages = manifestPackageNames.filter((name) => !referencedNames.has(name));
  const referencedMissingFromManifest = collected.names.filter((name) => manifestPackageNames.length > 0 && !manifestNames.has(name));
  const packages = collected.names.map((name) => {
    const publishedVersion = versionMap[name] ?? defaultVersion;
    return {
      name,
      publishedVersion: publishedVersion ?? null,
      targetSpec: publishedVersion ? `^${publishedVersion}` : null,
      directRefs: collected.direct.filter((item) => item.name === name),
      overrideRef: collected.overrides.find((item) => item.name === name) ?? null,
      npmError: probeErrors[name] ?? null,
    };
  });

  const blockers = [];
  if (!planOnly) {
    for (const item of packages) {
      if (!item.publishedVersion) {
        blockers.push({
          package: item.name,
          reason: item.npmError ? `npm lookup failed: ${item.npmError}` : "no published version supplied",
        });
      }
    }
  }

  const targetEdits = [];
  for (const item of packages) {
    for (const direct of item.directRefs) {
      targetEdits.push({
        file: "package.json",
        path: `${direct.section}.${item.name}`,
        from: direct.spec,
        to: item.targetSpec ?? "<published-version>",
      });
    }
    if (item.overrideRef) {
      targetEdits.push({
        file: "pnpm-workspace.yaml",
        path: `overrides.${item.name}`,
        from: item.overrideRef.spec,
        to: "<remove>",
      });
    }
  }

  return {
    ok: blockers.length === 0,
    planOnly,
    packageCount: packages.length,
    activeMigrationPackageCount: packages.length,
    handoffPackageCount: manifestPackageNames.length || null,
    vendorOnlyPackages,
    referencedMissingFromManifest,
    directFileRefCount: collected.direct.length,
    overrideFileRefCount: collected.overrides.length,
    packages,
    blockers,
    targetEdits,
    followUpCommands: ["pnpm install", "pnpm test"],
  };
}

function formatPlan(plan) {
  const lines = [];
  const status = plan.planOnly ? "PLAN ONLY" : plan.ok ? "READY" : "BLOCKED";
  lines.push(`Refarm publication readiness: ${status}`);
  if (plan.handoffPackageCount !== null) {
    lines.push(`Handoff manifest packages: ${plan.handoffPackageCount}`);
  }
  lines.push(`Active file-ref packages to migrate: ${plan.activeMigrationPackageCount}`);
  lines.push(`Direct file refs: ${plan.directFileRefCount}`);
  lines.push(`Workspace override file refs: ${plan.overrideFileRefCount}`);
  if (plan.vendorOnlyPackages.length) {
    lines.push(`Vendor-only handoff packages: ${plan.vendorOnlyPackages.join(", ")}`);
  }
  if (plan.referencedMissingFromManifest.length) {
    lines.push(`Referenced packages missing from manifest: ${plan.referencedMissingFromManifest.join(", ")}`);
  }
  lines.push("");

  if (plan.blockers.length) {
    lines.push("Blockers:");
    for (const blocker of plan.blockers) {
      lines.push(`- ${blocker.package}: ${blocker.reason}`);
    }
    lines.push("");
  }

  lines.push("Target edits:");
  for (const edit of plan.targetEdits) {
    lines.push(`- ${edit.file} ${edit.path}: ${edit.from} -> ${edit.to}`);
  }
  lines.push("");
  lines.push("After editing:");
  for (const command of plan.followUpCommands) {
    lines.push(`- ${command}`);
  }

  return `${lines.join("\n")}\n`;
}

export function createPlanFromDisk(options = {}) {
  const root = resolve(options.root ?? ROOT);
  const pkgPath = join(root, "package.json");
  const workspacePath = join(root, "pnpm-workspace.yaml");
  const manifestPath = join(root, "vendor", "manifest.json");
  if (!existsSync(pkgPath)) throw new Error(`Missing ${pkgPath}`);
  if (!existsSync(workspacePath)) throw new Error(`Missing ${workspacePath}`);

  const pkg = readJson(pkgPath);
  const workspace = readYaml(workspacePath);
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : null;
  const collected = collectRefarmFileSpecs(pkg, workspace);
  const { defaultVersion, versions } = loadVersionMap({
    root,
    assumeVersion: options.assumeVersion,
    versionsPath: options.versionsPath,
  });

  let probe = { versions: {}, errors: {} };
  if (options.probeNpm) {
    probe = probeNpmVersions(collected.names);
  }

  return buildPublicationPlan({
    pkg,
    workspace,
    manifest,
    versionMap: { ...versions, ...probe.versions },
    defaultVersion,
    probeErrors: probe.errors,
    planOnly: options.planOnly,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = createPlanFromDisk(args);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    process.stdout.write(formatPlan(plan));
  }
  process.exitCode = plan.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

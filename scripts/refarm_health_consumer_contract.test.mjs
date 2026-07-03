import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import { ToolchainAuditor } from "@refarm.dev/health";
import {
  buildEnvironmentPressureReport,
  planEnvironmentWorkCeiling,
} from "@refarm.dev/health/environment-pressure";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/health";
const TGZ = "file:vendor/refarm.dev-health-0.1.0.tgz";

test("vault-seed pins @refarm.dev/health via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.devDependencies?.[PKG]).toBe(TGZ);

  const workspace = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  expect(workspace).toContain(`"${PKG}": "${TGZ}"`);
});

test("ToolchainAuditor can express the dgk substrate without owning product copy", async () => {
  const auditor = new ToolchainAuditor({
    title: "dgk substrate",
    pathChecks: [{ id: "package_json", label: "package manifest", path: "package.json" }],
    commandChecks: [{ id: "node", command: "node", args: ["--version"] }],
    spawnSync(command, args) {
      return {
        status: command === "node" && args.join(" ") === "--version" ? 0 : 1,
        stdout: "v24.6.0\n",
        stderr: "",
      };
    },
  });

  const report = await auditor.audit({ rootDir: ROOT });

  expect(report.ok).toBe(true);
  expect(report.missing).toEqual([]);
  expect(report.checks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "package_json", ok: true, required: true }),
      expect.objectContaining({ id: "node", ok: true, version: "v24.6.0" }),
    ]),
  );
});

test("environment pressure returns a work ceiling instead of executing recovery", () => {
  const report = buildEnvironmentPressureReport({
    cwd: ROOT,
    command: "dgk check",
    operation: "preflight",
    now: new Date("2026-07-03T14:26:03.806Z"),
    os: {
      totalmem: () => 8 * 1024 * 1024 * 1024,
      freemem: () => 7 * 1024 * 1024 * 1024,
    },
    fs: {
      statfsSync: () => ({
        bavail: 80_000,
        bsize: 1024 * 1024,
        blocks: 100_000,
      }),
      existsSync: () => false,
    },
  });

  expect(report.decision).toBe("continue");

  const ceiling = planEnvironmentWorkCeiling(report, {
    workClass: "broad-check",
    command: "pnpm run validate",
    fallbackCommand: "pnpm test scripts/refarm_health_consumer_contract.test.mjs",
  });

  expect(ceiling).toEqual(
    expect.objectContaining({
      ok: true,
      decision: "allow",
      workClass: "broad-check",
      pressureDecision: "continue",
    }),
  );
});

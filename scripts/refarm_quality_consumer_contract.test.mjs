import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import {
  QUALITY_CAPABILITY,
  createRegexQualityChecker,
  runQualityCheck,
} from "@refarm.dev/quality-contract-v1";

// vault-seed consumes quality:v1 for declared quality intentions while keeping
// rule catalogs, severity policy, and rendered-subject collection downstream.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/quality-contract-v1";
const TGZ = "file:vendor/refarm.dev-quality-contract-v1-0.1.0.tgz";

test("vault-seed pins @refarm.dev/quality-contract-v1 via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe(TGZ);
});

test("the consumed quality:v1 surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = ["index", "types", "profile", "reference", "report", "conformance"]
    .map((f) => readFileSync(join(base, `${f}.d.ts`), "utf8"))
    .join("\n");
  for (const name of [
    "QUALITY_CAPABILITY",
    "QualityProfile",
    "QualityRule",
    "QualityFinding",
    "QualityReport",
    "QualityChecker",
    "createRegexQualityChecker",
    "runQualityCheck",
    "runQualityV1Conformance",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

test("vault-seed can declare a downstream quality profile and emit a quality:v1 report", async () => {
  const checker = createRegexQualityChecker({
    checkerId: "vault-seed:text-reference",
    domain: "text",
  });

  const report = await runQualityCheck(
    checker,
    "Este texto ainda contem FIXME antes da publicacao.",
    {
      name: "vault-seed-docs",
      rules: [
        {
          id: "no-fixme",
          severity: "error",
          description: "Published docs must not carry FIXME markers.",
          check: { type: "regex", pattern: "FIXME" },
        },
      ],
    },
  );

  expect(report.capability).toBe(QUALITY_CAPABILITY);
  expect(report.checkerId).toBe("vault-seed:text-reference");
  expect(report.domain).toBe("text");
  expect(report.profileName).toBe("vault-seed-docs");
  expect(report.counts.error).toBe(1);
  expect(report.findings[0]).toMatchObject({
    severity: "error",
    ruleId: "no-fixme",
  });
});

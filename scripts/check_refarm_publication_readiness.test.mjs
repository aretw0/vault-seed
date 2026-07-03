import { test, expect } from "vitest";
import { buildPublicationPlan } from "./check_refarm_publication_readiness.mjs";

const pkg = {
  dependencies: {
    "@refarm.dev/content-projection": "file:vendor/refarm.dev-content-projection-0.1.0.tgz",
    "@refarm.dev/records-contract-v1": "file:vendor/refarm.dev-records-contract-v1-0.1.0.tgz",
    astro: "^6.4.4",
  },
  devDependencies: {
    "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz",
  },
};

const workspace = {
  overrides: {
    "@refarm.dev/content-projection": "file:vendor/refarm.dev-content-projection-0.1.0.tgz",
    "@refarm.dev/records-contract-v1": "file:vendor/refarm.dev-records-contract-v1-0.1.0.tgz",
    "@refarm.dev/source-contract-v1": "file:vendor/refarm.dev-source-contract-v1-0.1.0.tgz",
  },
};

const manifest = {
  packages: [
    { packageName: "@refarm.dev/content-projection" },
    { packageName: "@refarm.dev/ds" },
    { packageName: "@refarm.dev/records-contract-v1" },
    { packageName: "@refarm.dev/release-engine" },
    { packageName: "@refarm.dev/source-contract-v1" },
  ],
};

test("builds the file-to-npm target edits when versions are known", () => {
  const plan = buildPublicationPlan({ pkg, workspace, manifest, defaultVersion: "0.2.0" });

  expect(plan.ok).toBe(true);
  expect(plan.packageCount).toBe(4);
  expect(plan.handoffPackageCount).toBe(5);
  expect(plan.activeMigrationPackageCount).toBe(4);
  expect(plan.vendorOnlyPackages).toEqual(["@refarm.dev/release-engine"]);
  expect(plan.directFileRefCount).toBe(3);
  expect(plan.overrideFileRefCount).toBe(3);
  expect(plan.targetEdits).toContainEqual({
    file: "package.json",
    path: "dependencies.@refarm.dev/content-projection",
    from: "file:vendor/refarm.dev-content-projection-0.1.0.tgz",
    to: "^0.2.0",
  });
  expect(plan.targetEdits).toContainEqual({
    file: "pnpm-workspace.yaml",
    path: "overrides.@refarm.dev/source-contract-v1",
    from: "file:vendor/refarm.dev-source-contract-v1-0.1.0.tgz",
    to: "<remove>",
  });
});

test("blocks the release swap when any refarm package has no published version source", () => {
  const plan = buildPublicationPlan({
    pkg,
    workspace,
    versionMap: {
      "@refarm.dev/content-projection": "0.2.0",
    },
  });

  expect(plan.ok).toBe(false);
  expect(plan.blockers.map((item) => item.package)).toEqual([
    "@refarm.dev/ds",
    "@refarm.dev/records-contract-v1",
    "@refarm.dev/source-contract-v1",
  ]);
});

test("plan-only mode records the migration surface without blocking on npm", () => {
  const plan = buildPublicationPlan({ pkg, workspace, planOnly: true });

  expect(plan.ok).toBe(true);
  expect(plan.targetEdits.length).toBeGreaterThan(0);
  expect(plan.targetEdits.find((edit) => edit.path === "dependencies.@refarm.dev/records-contract-v1")?.to).toBe("<published-version>");
});

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const TGZ = "file:vendor/refarm.dev-local-surface-0.1.0.tgz";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("refarm local-surface consumer proof", () => {
  test("declares the local-surface handoff package as a packed dependency", () => {
    const pkg = readJson("package.json");
    const workspace = readFileSync("pnpm-workspace.yaml", "utf8");

    expect(pkg.dependencies?.["@refarm.dev/local-surface"]).toBe(TGZ);
    expect(workspace).toContain(`"@refarm.dev/local-surface": "${TGZ}"`);
  });

  test("builds a local-first white-label surface without upstreaming product UX", async () => {
    const {
      buildLocalSurfaceLaunchPlan,
      checkLocalSurfaceQuality,
      createLocalSurfaceManifest,
      renderLocalSurfaceDocument,
    } = await import("@refarm.dev/local-surface");

    const manifest = createLocalSurfaceManifest({
      id: "vault-local-operator",
      title: "Local Operator",
      description: "Loopback-only operator surface for vault tasks and local agent handoffs.",
      routeBase: "/operator",
      theme: "verde-jardim",
      storageNamespaces: ["publishing", "runtime"],
      panels: [
        {
          id: "tasks",
          title: "Task Queue",
          summary: "Local task state and review receipts stay in the vault checkout.",
          kind: "activity",
          rows: [{ queue: "publication", state: "review" }],
        },
        {
          id: "agents",
          title: "Agent Handoffs",
          summary: "Runtime adapters and command labels remain downstream-owned.",
          kind: "status",
        },
      ],
      actions: [
        { id: "review", label: "Review", kind: "review", target: ".dgk/outbox-publicacao.json", requiresReview: true },
        { id: "serve", label: "Open", kind: "navigate", target: "/operator" },
      ],
      evidence: ["docs/convergencia-refarm-proof-2026-07-03.md"],
      boundaries: [
        "Provider adapters, routes, screenshots, and product vocabulary stay in vault-seed.",
        "The proof consumes the vault-seed-ready handoff package; publication remains a Refarm release-lane decision.",
      ],
    });

    expect(manifest.schema).toBe("local-surface.v1");
    expect(manifest.capability).toBe("local-surface:v1");
    expect(manifest.routeBase).toBe("/operator");
    expect(manifest.localFirst).toEqual({
      mode: "local-only",
      storageNamespaces: ["publishing", "runtime"],
      networkRequired: false,
    });

    const html = renderLocalSurfaceDocument(manifest);
    expect(html).toContain("local-surface");
    expect(html).toContain("Task Queue");
    expect(html).not.toContain("provider setup");

    const launchPlan = buildLocalSurfaceLaunchPlan(manifest, {
      commandLabel: "dgk",
      manifestPath: ".dgk/local-surface.json",
      port: 4322,
    });
    expect(launchPlan.schema).toBe("local-surface.launch-plan.v1");
    expect(launchPlan.steps.map((step) => step.id)).toEqual(["doctor", "render", "serve", "handoff"]);
    expect(launchPlan.steps.every((step) => step.command.startsWith("dgk "))).toBe(true);

    const quality = await checkLocalSurfaceQuality(manifest);
    expect(quality.capability).toBe("quality:v1");
    expect(quality.metrics).toMatchObject({
      panelCount: 2,
      actionCount: 2,
      storageNamespaceCount: 2,
    });
    expect(quality.counts.fail ?? 0).toBe(0);
  });
});

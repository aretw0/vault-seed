import { test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Explorar remains the canonical MD/MDX surface instead of adding records pages", () => {
  expect(existsSync(".site/pages/records/index.astro")).toBe(false);

  const explorePage = read(".site/pages/explorar/index.astro");
  const exploreLib = read(".site/lib/vault-explore.ts");
  const vaultData = read("scripts/generate_vault_data.mjs");
  const rootPkg = read("package.json");

  expect(explorePage).toMatch(/buildVaultExploreData/);
  expect(explorePage).toMatch(/data-vault-explore-results/);
  expect(explorePage).toMatch(/data-vault-explore-type/);
  expect(exploreLib).toMatch(/loadVaultContentItems/);
  expect(exploreLib).toMatch(/buildExploreRecordsTable/);
  expect(exploreLib).not.toMatch(/globSync/);
  expect(vaultData).not.toMatch(/from\s+["']@refarm\.dev\//);
  expect(vaultData).toMatch(/CONTENT_EXTENSIONS = \["md", "mdx"\]/);
  expect(rootPkg).not.toMatch(/@aretw0\/(?:vault|dgk)-(?:blocks|content-blocks|astro-blocks)/);
});

test("MDX migration boundary keeps reusable Astro blocks upstream in refarm", () => {
  const design = read("docs/superpowers/specs/2026-06-30-records-view-design.md");
  const status = read("docs/convergencia-refarm-status.md");
  const feedback = read("docs/convergencia-refarm-feedback.md");

  expect(design).toMatch(/MDX is the authoring migration path/);
  expect(design).toMatch(/Refarm owns .*reusable Astro\/SSR\/content blocks/);
  expect(status).toMatch(/blocos reutilizáveis[\s\S]*devem vir do\s+refarm/);
  expect(feedback).toMatch(/blocos MDX\/Astro\/SSR reutilizáveis/);
});

import { test, expect } from "vitest";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("deploy-site workflow keeps GitHub Pages deploy gated by build and smoke", () => {
  const workflow = read(".github/workflows/deploy-site.yml").replace(/\r\n/g, "\n");
  const packageJson = JSON.parse(read("package.json"));

  expect(packageJson.scripts["site:build"]).toBe("node scripts/clean_site_dist.mjs && pnpm --filter @aretw0/dgk-astro-plugins build && astro build");
  expect(packageJson.scripts["site:check"]).toBe("node scripts/smoke_site.js");
  expect(workflow).toMatch(/name: Deploy Site/);
  expect(workflow).toMatch(/push:\n\s+branches: \[main\]/);
  expect(workflow).toMatch(/workflow_dispatch:/);
  expect(workflow).toMatch(/permissions:\n\s+contents: read\n\s+pages: write\n\s+id-token: write/);
  expect(workflow).toMatch(/concurrency:\n\s+group: pages\n\s+cancel-in-progress: true/);
  expect(workflow).toMatch(/build:\n\s+name: Build Astro site\n\s+runs-on: ubuntu-latest\n\s+timeout-minutes: 15/);
  expect(workflow).toMatch(/"package\.json"/);
  expect(workflow).toMatch(/"pnpm-lock\.yaml"/);
  expect(workflow).toMatch(/"scripts\/\*\*"/);
  expect(workflow).toMatch(/"docs\/\*\*"/);
  expect(workflow).toMatch(/run: pnpm run validate/);
  expect(workflow.indexOf("run: pnpm run validate") < workflow.indexOf("run: pnpm run site:build"), "deploy must run the canonical vault validation before building Pages artifacts").toBeTruthy();
  expect(workflow).toMatch(/run: pnpm --filter @aretw0\/dgk-astro-plugins build/);
  expect(workflow).toMatch(/run: pnpm run site:build/);
  expect(workflow).toMatch(/uses: astral-sh\/setup-uv@[0-9a-f]{40}/);
  expect(workflow).toMatch(/version: "0\.11\.11"/);
  expect(workflow).not.toMatch(/uv pip install --system/);
  expect(workflow).toMatch(/run: pnpm run notebooks:export/);
  expect(workflow.indexOf("run: pnpm run notebooks:export") < workflow.indexOf("run: pnpm run site:check"), "notebooks must be exported before site:check so smoke_site validates published notebook HTML").toBeTruthy();
  const notebooksPathEnvCount = (
    workflow.match(/VAULT_NOTEBOOKS_PATH: \$\{\{ vars\.VAULT_NOTEBOOKS_PATH \|\| 'lab' \}\}/g) || []
  ).length;
  expect(notebooksPathEnvCount >= 3, "build, notebook export, site check, and responsive smoke should honor VAULT_NOTEBOOKS_PATH").toBeTruthy();
  expect(workflow).toMatch(/VAULT_SITE_REQUIRE_NOTEBOOKS: "1"/);
  expect(packageJson.scripts["notebooks:data"]).toMatch(/generate_vault_data\.mjs/);
  expect(packageJson.scripts["notebooks:dev"]).toMatch(/notebooks_dev\.mjs/);
  expect(packageJson.scripts["notebooks:export"]).toMatch(/export_notebooks\.mjs/);
  // ASTRO_SITE and ASTRO_BASE come from a detection step that checks for a
  // custom Pages domain (CNAME) and falls back to github.io + repo-name base.
  expect(workflow).toMatch(/id: pages-url/);
  expect(workflow).toMatch(/gh api.*\/pages.*\.cname/);
  expect(workflow).toMatch(/github\.repository_owner.*\.github\.io/);
  expect(workflow).toMatch(/github\.event\.repository\.name/);
  expect(workflow).toMatch(/ASTRO_SITE: \$\{\{ steps\.pages-url\.outputs\.site \}\}/);
  expect(workflow).toMatch(/ASTRO_BASE: \$\{\{ steps\.pages-url\.outputs\.base \}\}/);
  expect(workflow).toMatch(/run: pnpm run site:check/);
  expect(workflow).toMatch(/uses: actions\/upload-pages-artifact@[0-9a-f]{40}/);
  expect(workflow).toMatch(/path: dist\//);
  expect(workflow).toMatch(/deploy:\n\s+name: Deploy to GitHub Pages\n\s+needs: build/);
  expect(workflow).toMatch(/environment:\n\s+name: github-pages\n\s+url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
  expect(workflow).toMatch(/uses: actions\/deploy-pages@[0-9a-f]{40}/);
  expect(workflow).not.toMatch(/pull_request_target:/);
  expect(workflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|npm publish|changeset publish/);
});

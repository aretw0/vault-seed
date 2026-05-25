const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("deploy-site workflow keeps GitHub Pages deploy gated by build and smoke", () => {
  const workflow = read(".github/workflows/deploy-site.yml");
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(
    packageJson.scripts["site:build"],
    "node scripts/clean_site_dist.mjs && pnpm --filter @dgk/astro-plugins build && astro build",
  );
  assert.equal(packageJson.scripts["site:check"], "node scripts/smoke_site.js");
  assert.match(workflow, /name: Deploy Site/);
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+pages: write\n\s+id-token: write/);
  assert.match(workflow, /concurrency:\n\s+group: pages\n\s+cancel-in-progress: true/);
  assert.match(workflow, /build:\n\s+name: Build Astro site\n\s+runs-on: ubuntu-latest\n\s+timeout-minutes: 15/);
  assert.match(workflow, /"package\.json"/);
  assert.match(workflow, /"pnpm-lock\.yaml"/);
  assert.match(workflow, /"scripts\/\*\*"/);
  assert.match(workflow, /"docs\/\*\*"/);
  assert.match(workflow, /run: pnpm --filter @dgk\/astro-plugins build/);
  assert.match(workflow, /run: pnpm run site:build/);
  assert.match(workflow, /uses: astral-sh\/setup-uv@[0-9a-f]{40}/);
  assert.match(workflow, /version: "0\.11\.11"/);
  assert.doesNotMatch(workflow, /uv pip install --system/);
  assert.match(workflow, /run: pnpm run notebooks:export/);
  assert.ok(
    workflow.indexOf("run: pnpm run notebooks:export") < workflow.indexOf("run: pnpm run site:check"),
    "notebooks must be exported before site:check so smoke_site validates published notebook HTML",
  );
  const notebooksPathEnvCount = (workflow.match(/VAULT_NOTEBOOKS_PATH: \$\{\{ vars\.VAULT_NOTEBOOKS_PATH \|\| 'lab' \}\}/g) || []).length;
  assert.ok(notebooksPathEnvCount >= 3, "build, notebook export, site check, and responsive smoke should honor VAULT_NOTEBOOKS_PATH");
  assert.match(workflow, /VAULT_SITE_REQUIRE_NOTEBOOKS: "1"/);
  assert.match(packageJson.scripts["notebooks:data"], /generate_vault_data\.mjs/);
  assert.match(packageJson.scripts["notebooks:dev"], /notebooks_dev\.mjs/);
  assert.match(packageJson.scripts["notebooks:export"], /export_notebooks\.mjs/);
  // ASTRO_SITE and ASTRO_BASE come from a detection step that checks for a
  // custom Pages domain (CNAME) and falls back to github.io + repo-name base.
  assert.match(workflow, /id: pages-url/);
  assert.match(workflow, /gh api.*\/pages.*\.cname/);
  assert.match(workflow, /github\.repository_owner.*\.github\.io/);
  assert.match(workflow, /github\.event\.repository\.name/);
  assert.match(workflow, /ASTRO_SITE: \$\{\{ steps\.pages-url\.outputs\.site \}\}/);
  assert.match(workflow, /ASTRO_BASE: \$\{\{ steps\.pages-url\.outputs\.base \}\}/);
  assert.match(workflow, /run: pnpm run site:check/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /path: dist\//);
  assert.match(workflow, /deploy:\n\s+name: Deploy to GitHub Pages\n\s+needs: build/);
  assert.match(workflow, /environment:\n\s+name: github-pages\n\s+url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/);
  assert.match(workflow, /uses: actions\/deploy-pages@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|npm publish|changeset publish/);
});

import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("headspace route consumes the credentials seam instead of importing refarm directly", () => {
  const page = read(".site/pages/headspace/index.astro");

  expect(page).toMatch(/loadVaultCredentialsHeadspace/);
  expect(page).toMatch(/data-vault-credentials-headspace/);
  expect(page).toMatch(/data-stack-state=\{stackState\}/);
  expect(page).toMatch(/data-vault-credentials-capability=\{capability\.id\}/);
  expect(page).toMatch(/policyJson/);
  expect(page).not.toMatch(/@refarm\.dev\/credentials-contract-v1/);
  expect(page).not.toMatch(/createReferenceCredentialsProvider/);
});

test("headspace route is styled with stable local primitives", () => {
  const css = read(".site/styles/custom.css");

  expect(css).toMatch(/\.vault-headspace\s*\{/);
  expect(css).toMatch(/\.vault-headspace__policy\s*\{/);
  expect(css).toMatch(/overflow:\s*auto/);
});

import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import { createReferenceCredentialsProvider, runCredentialsV1Conformance } from "@refarm.dev/credentials-contract-v1";
import { createHeartwoodIdentityProvider } from "@refarm.dev/identity-heartwood";
import { MemoryStorage } from "@refarm.dev/storage-memory";

// vault-seed assimilates credentials:v1 — W3C Verifiable Credentials over identity:v1 + storage:v1,
// with heartwood-backed Ed25519 signing — ahead of the headspace VC UX (issue/present/verify signed
// claims). Assimilation only: pins + surface + a real round-trip proof, adopted behind a product seam.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/credentials-contract-v1";

test("vault-seed pins credentials:v1 + its reference impls via local tarballs", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe("file:vendor/refarm.dev-credentials-contract-v1-0.1.0.tgz");
  expect(pkg.dependencies?.["@refarm.dev/identity-heartwood"]).toBe("file:vendor/refarm.dev-identity-heartwood-0.1.0.tgz");
  expect(pkg.dependencies?.["@refarm.dev/storage-memory"]).toBe("file:vendor/refarm.dev-storage-memory-0.1.0.tgz");
});

test("the transitive contract deps are pinned via workspace overrides", () => {
  const ws = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  for (const name of ["identity-contract-v1", "storage-contract-v1", "heartwood"]) {
    expect(ws, `missing override for ${name}`).toMatch(
      new RegExp(`@refarm\\.dev/${name}["']?:\\s*["']?file:vendor/`),
    );
  }
});

test("the consumed credentials:v1 surface is exported", () => {
  const base = join(ROOT, "node_modules", PKG, "dist");
  const dts = readdirSync(base)
    .filter((f) => f.endsWith(".d.ts"))
    .map((f) => readFileSync(join(base, f), "utf8"))
    .join("\n");
  for (const name of [
    "CREDENTIALS_CAPABILITY",
    "VerifiableCredential",
    "VerifiablePresentation",
    "CredentialsProvider",
    "createReferenceCredentialsProvider",
    "runCredentialsV1Conformance",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

// Adoption proof: vault-seed stands up a real, heartwood-signed credentials:v1 provider (Ed25519 via
// identity-heartwood, wallet via storage-memory) and it passes the contract's own conformance suite
// end-to-end (issue -> present -> verify). This is the foundation the headspace VC UX will build on.
test("a heartwood-signed credentials:v1 provider passes the contract conformance", async () => {
  const identity = createHeartwoodIdentityProvider();
  const storage = new MemoryStorage();
  const provider = createReferenceCredentialsProvider({ identity, storage });

  const issuer = await identity.create({ label: "vault-seed issuer" });
  const holder = await identity.create({ label: "vault-seed holder" });

  const result = await runCredentialsV1Conformance(provider, {
    issuerIdentityId: issuer.id,
    holderIdentityId: holder.id,
  });

  expect(result.failures, JSON.stringify(result.failures)).toEqual([]);
  expect(result.failed).toBe(0);
  expect(result.pass).toBe(true);
  expect(result.total).toBeGreaterThanOrEqual(1);
});

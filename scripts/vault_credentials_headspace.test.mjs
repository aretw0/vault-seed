import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadVaultCredentialsHeadspace, verifyWithVaultPolicy } from "../.site/lib/vault-credentials.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("credentials headspace degrades when the refarm stack is unavailable", async () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, "vault.config.json"), "utf8"));
  const headspace = await loadVaultCredentialsHeadspace({
    importers: {
      credentials: async () => { throw new Error("missing credentials"); },
      identity: async () => { throw new Error("missing identity"); },
      storage: async () => { throw new Error("missing storage"); },
    },
  });

  expect(headspace.available).toBe(false);
  expect(headspace.reason).toBe("credentials-stack-unavailable");
  expect(headspace.policy).toEqual(cfg.credentials.verificationPolicy);
  expect(headspace.capabilities).toEqual({
    issue: false,
    wallet: false,
    present: false,
    verify: false,
  });
});

test("credentials headspace composes the provider with the configured verification policy", async () => {
  const calls = [];
  const fakeProvider = {
    async verify(input, policy) {
      calls.push({ input, policy });
      return { verified: true, checks: { issuerTrusted: { ok: true } } };
    },
  };

  const headspace = await loadVaultCredentialsHeadspace({
    importers: {
      credentials: async () => ({
        createReferenceCredentialsProvider({ identity, storage }) {
          calls.push({ identity, storage });
          return fakeProvider;
        },
      }),
      identity: async () => ({
        createHeartwoodIdentityProvider() {
          return { kind: "identity" };
        },
      }),
      storage: async () => ({
        MemoryStorage: class {
          kind = "storage";
        },
      }),
    },
    policy: {
      trustSelf: true,
      trustedIssuers: ["did:example:issuer"],
      revocation: "required",
      validity: "required",
    },
  });

  expect(headspace.available).toBe(true);
  expect(headspace.capabilities.verify).toBe(true);

  const verdict = await verifyWithVaultPolicy({ id: "vc:1" }, { headspace });
  expect(verdict.verified).toBe(true);
  expect(calls).toEqual([
    { identity: { kind: "identity" }, storage: { kind: "storage" } },
    {
      input: { id: "vc:1" },
      policy: {
        trustSelf: true,
        trustedIssuers: ["did:example:issuer"],
        revocation: "required",
        validity: "required",
      },
    },
  ]);
});

test("verifyWithVaultPolicy returns a disabled verdict when the stack is absent", async () => {
  const verdict = await verifyWithVaultPolicy({ id: "vc:1" }, {
    importers: {
      credentials: async () => { throw new Error("missing credentials"); },
      identity: async () => { throw new Error("missing identity"); },
      storage: async () => { throw new Error("missing storage"); },
    },
  });

  expect(verdict.available).toBe(false);
  expect(verdict.verified).toBe(false);
  expect(verdict.reason).toBe("credentials-stack-unavailable");
});

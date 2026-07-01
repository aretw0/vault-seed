import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveNotebooksPath } from "./notebook_path.cjs";

async function loadEsmResolver() {
  return (await import("./notebook_path.mjs")).resolveNotebooksPath;
}

test("resolveNotebooksPath accepts a single URL segment", async () => {
  for (const resolver of [resolveNotebooksPath, await loadEsmResolver()]) {
    expect(resolver(undefined)).toBe("lab");
    expect(resolver("notebooks")).toBe("notebooks");
    expect(resolver(" studio ")).toBe("studio");
    expect(resolver("/lab/")).toBe("lab");
  }
});

test("resolveNotebooksPath rejects traversal and nested paths", async () => {
  for (const resolver of [resolveNotebooksPath, await loadEsmResolver()]) {
    for (const value of ["../dist", "lab/../dist", "lab/assets", ".", " lab assets "]) {
      expect(() => resolver(value)).toThrow(/VAULT_NOTEBOOKS_PATH inválido/);
    }
  }
});

test("writeVaultData validates custom notebook output path", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vault-data-path-"));
  const { writeVaultData } = await import("./generate_vault_data.mjs");

  expect(() => writeVaultData({ cwd: tmp, notebooksPath: "bad/path" })).toThrow(/VAULT_NOTEBOOKS_PATH inválido/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveNotebooksPath } = require("./notebook_path.cjs");

async function loadEsmResolver() {
  return (await import("./notebook_path.mjs")).resolveNotebooksPath;
}

test("resolveNotebooksPath accepts a single URL segment", async () => {
  for (const resolver of [resolveNotebooksPath, await loadEsmResolver()]) {
    assert.equal(resolver(undefined), "lab");
    assert.equal(resolver("notebooks"), "notebooks");
    assert.equal(resolver(" studio "), "studio");
    assert.equal(resolver("/lab/"), "lab");
  }
});

test("resolveNotebooksPath rejects traversal and nested paths", async () => {
  for (const resolver of [resolveNotebooksPath, await loadEsmResolver()]) {
    for (const value of ["../dist", "lab/../dist", "lab/assets", ".", " lab assets "]) {
      assert.throws(() => resolver(value), /VAULT_NOTEBOOKS_PATH inválido/);
    }
  }
});

test("writeVaultData validates custom notebook output path", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vault-data-path-"));
  const { writeVaultData } = await import("./generate_vault_data.mjs");

  assert.throws(
    () => writeVaultData({ cwd: tmp, notebooksPath: "bad/path" }),
    /VAULT_NOTEBOOKS_PATH inválido/,
  );
});

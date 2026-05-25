const test = require("node:test");
const assert = require("node:assert/strict");
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

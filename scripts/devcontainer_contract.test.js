const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

test("devcontainer publishes the Astro site port for host browsers", () => {
  const config = readJson(".devcontainer/devcontainer.json");

  assert.deepEqual(config.forwardPorts, [4321, 2718]);
  assert.deepEqual(config.runArgs, ["--publish", "127.0.0.1:4321:4321"]);
  assert.equal(config.portsAttributes["4321"].label, "Vault Seed Astro site");
  assert.equal(config.portsAttributes["4321"].onAutoForward, "silent");
  assert.equal(config.portsAttributes["2718"].label, "Marimo notebooks");
  assert.equal(config.portsAttributes["2718"].onAutoForward, "silent");
});

test("devcontainer shell scripts stay LF-only for Linux bash", () => {
  for (const path of [".devcontainer/post-create.sh", ".devcontainer/post-start.sh", ".devcontainer/vault"]) {
    const content = fs.readFileSync(path, "utf8");
    assert.equal(content.includes("\r"), false, `${path} must stay LF-only`);
  }
});

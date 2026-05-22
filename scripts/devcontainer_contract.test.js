const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

test("devcontainer publishes the Astro site port for host browsers", () => {
  const config = readJson(".devcontainer/devcontainer.json");

  assert.deepEqual(config.forwardPorts, [4321]);
  assert.deepEqual(config.runArgs, ["--publish", "127.0.0.1:4321:4321"]);
  assert.equal(config.portsAttributes["4321"].label, "Vault Seed Astro site");
  assert.equal(config.portsAttributes["4321"].onAutoForward, "silent");
});
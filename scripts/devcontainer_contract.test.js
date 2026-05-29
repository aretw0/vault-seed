const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

test("devcontainer publishes the Astro site port for host browsers", () => {
  const config = readJson(".devcontainer/devcontainer.json");
  const expectedPorts = [4321, 2718];

  assert.deepEqual(config.forwardPorts, expectedPorts);
  for (const port of expectedPorts) {
    assert.ok(
      config.runArgs.includes(`127.0.0.1:${port}:${port}`),
      `missing explicit host publish for ${port}`,
    );
    assert.equal(config.portsAttributes[String(port)].onAutoForward, "silent");
  }
  assert.equal(config.portsAttributes["4321"].label, "Vault Seed Astro site");
  assert.equal(config.portsAttributes["2718"].label, "Marimo notebooks");
});

test("devcontainer shell scripts stay LF-only for Linux bash", () => {
  for (const path of [".devcontainer/Dockerfile", ".devcontainer/post-create.sh", ".devcontainer/post-start.sh", ".devcontainer/vault"]) {
    const content = fs.readFileSync(path, "utf8");
    assert.equal(content.includes("\r"), false, `${path} must stay LF-only`);
  }
});

test("devcontainer provides the baseline sandbox tools expected by agents", () => {
  const config = readJson(".devcontainer/devcontainer.json");
  const dockerfile = fs.readFileSync(".devcontainer/Dockerfile", "utf8");
  const postCreate = fs.readFileSync(".devcontainer/post-create.sh", "utf8");
  const postStart = fs.readFileSync(".devcontainer/post-start.sh", "utf8");

  assert.deepEqual(config.build, { dockerfile: "Dockerfile", context: "." });
  assert.deepEqual(config.features["ghcr.io/devcontainers/features/github-cli:1"], {});
  assert.deepEqual(config.features["ghcr.io/jsburckhardt/devcontainer-features/uv:1"], {});

  for (const packageName of [
    "bash-completion",
    "bubblewrap",
    "fd-find",
    "git-lfs",
    "hyperfine",
    "jq",
    "ripgrep",
    "shellcheck",
    "shfmt",
    "tree",
    "unzip",
  ]) {
    assert.match(dockerfile, new RegExp(`\\b${packageName}\\b`), `${packageName} must be installed in the devcontainer image`);
  }

  assert.match(dockerfile, /ln -sf \/usr\/bin\/fdfind \/usr\/local\/bin\/fd/);
  assert.match(postCreate, /if \[ -d "\$ROOT\/\.git\/objects" \]; then/);
  assert.match(postCreate, /sudo chown -R "\$\(id -u\):\$\(id -g\)" "\$ROOT\/\.git\/objects"/);
  assert.match(postStart, /if \[ -d "\$ROOT\/\.git\/objects" \]; then/);
  assert.match(postStart, /sudo chown -R "\$\(id -u\):\$\(id -g\)" "\$ROOT\/\.git\/objects"/);
  assert.match(postStart, /check_agent_sandbox_tools\(\)/);
  assert.match(postStart, /for tool in bwrap fd gh jq rg shellcheck shfmt tree uv; do/);
  assert.match(postStart, /Ferramentas de sandbox ausentes/);
});

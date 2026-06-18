const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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
  assert.deepEqual(config.features["ghcr.io/jsburckhardt/devcontainer-features/uv:1"], { version: "0.11.11" });

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

test("substrate check detects unapplied devcontainer node_modules volume", () => {
  if (process.platform !== "linux") return;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-seed-substrate-"));
  try {
    const binDir = path.join(tempDir, "node_modules", ".bin");
    fs.mkdirSync(path.join(tempDir, ".devcontainer"), { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    for (const binary of ["astro", "playwright", "markdownlint", "prettier", "changeset"]) {
      fs.writeFileSync(path.join(binDir, binary), "", { mode: 0o755 });
    }
    fs.writeFileSync(path.join(tempDir, "requirements.txt"), "\n");
    fs.writeFileSync(path.join(tempDir, "requirements.local-etl.txt"), "\n");
    fs.writeFileSync(
      path.join(tempDir, ".devcontainer", "devcontainer.json"),
      `${JSON.stringify({
        mounts: [
          `source=dgk-node-modules,target=${path.join(tempDir, "node_modules")},type=volume`,
        ],
      }, null, 2)}\n`,
    );

    const result = spawnSync(process.execPath, [path.resolve("scripts/check-substrate.mjs"), "--json"], {
      cwd: tempDir,
      encoding: "utf8",
      env: {
        ...process.env,
        REFARM_NODE_SUBSTRATE_MOUNTINFO: `36 29 0:32 / ${tempDir} rw,relatime - 9p C: rw\n`,
      },
    });

    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(payload.mountIssues, [
      {
        id: "devcontainer_node_modules_mount",
        path: "node_modules",
        target: path.join(tempDir, "node_modules"),
      },
    ]);
    assert.match(payload.nextCommand, /Rebuild\/reopen the devcontainer/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

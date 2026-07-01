import { test, expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

test("devcontainer publishes the Astro site port for host browsers", () => {
  const config = readJson(".devcontainer/devcontainer.json");
  const expectedPorts = [4321, 2718];

  expect(config.forwardPorts).toEqual(expectedPorts);
  for (const port of expectedPorts) {
    expect(config.runArgs.includes(`127.0.0.1:${port}:${port}`), `missing explicit host publish for ${port}`).toBeTruthy();
    expect(config.portsAttributes[String(port)].onAutoForward).toBe("silent");
  }
  expect(config.portsAttributes["4321"].label).toBe("Vault Seed Astro site");
  expect(config.portsAttributes["2718"].label).toBe("Marimo notebooks");
});

test("devcontainer shell scripts stay LF-only for Linux bash", () => {
  for (const path of [".devcontainer/Dockerfile", ".devcontainer/post-create.sh", ".devcontainer/post-start.sh", ".devcontainer/vault"]) {
    const content = fs.readFileSync(path, "utf8");
    expect(content.includes("\r"), `${path} must stay LF-only`).toBe(false);
  }
});

test("devcontainer provides the baseline sandbox tools expected by agents", () => {
  const config = readJson(".devcontainer/devcontainer.json");
  const dockerfile = fs.readFileSync(".devcontainer/Dockerfile", "utf8");
  const postCreate = fs.readFileSync(".devcontainer/post-create.sh", "utf8");
  const postStart = fs.readFileSync(".devcontainer/post-start.sh", "utf8");

  expect(config.build).toEqual({ dockerfile: "Dockerfile", context: "." });
  expect(config.features["ghcr.io/devcontainers/features/github-cli:1"]).toEqual({});
  expect(config.features["ghcr.io/jsburckhardt/devcontainer-features/uv:1"]).toEqual({ version: "0.11.11" });

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
    expect(dockerfile, `${packageName} must be installed in the devcontainer image`).toMatch(new RegExp(`\\b${packageName}\\b`));
  }

  expect(dockerfile).toMatch(/ln -sf \/usr\/bin\/fdfind \/usr\/local\/bin\/fd/);
  expect(postCreate).toMatch(/if \[ -d "\$ROOT\/\.git\/objects" \]; then/);
  expect(postCreate).toMatch(/sudo chown -R "\$\(id -u\):\$\(id -g\)" "\$ROOT\/\.git\/objects"/);
  expect(postStart).toMatch(/if \[ -d "\$ROOT\/\.git\/objects" \]; then/);
  expect(postStart).toMatch(/sudo chown -R "\$\(id -u\):\$\(id -g\)" "\$ROOT\/\.git\/objects"/);
  expect(postStart).toMatch(/check_agent_sandbox_tools\(\)/);
  expect(postStart).toMatch(/for tool in bwrap fd gh jq rg shellcheck shfmt tree uv; do/);
  expect(postStart).toMatch(/Ferramentas de sandbox ausentes/);
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

    const result = spawnSync(process.execPath, [path.resolve("packages/cli/vendor/check-substrate.mjs"), "--json"], {
      cwd: tempDir,
      encoding: "utf8",
      env: {
        ...process.env,
        REFARM_NODE_SUBSTRATE_MOUNTINFO: `36 29 0:32 / ${tempDir} rw,relatime - 9p C: rw\n`,
      },
    });

    expect(result.status).not.toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.mountIssues).toEqual([
      {
        id: "devcontainer_node_modules_mount",
        path: "node_modules",
        target: path.join(tempDir, "node_modules"),
      },
    ]);
    expect(payload.nextCommand).toMatch(/Rebuild\/reopen the devcontainer/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

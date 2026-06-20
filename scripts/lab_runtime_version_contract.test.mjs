import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const PYPROJECT = join(ROOT, "packages/lab-runtime/pyproject.toml");
const INIT = join(ROOT, "packages/lab-runtime/src/dgk_lab_runtime/__init__.py");

const STABLE_SEMVER = /^\d+\.\d+\.\d+$/;

function pyprojectVersion() {
  const content = readFileSync(PYPROJECT, "utf8");
  const match = content.match(/^version = "([^"]+)"/m);
  assert.ok(match, `Could not find a version in ${PYPROJECT}`);
  return match[1];
}

function initVersion() {
  const content = readFileSync(INIT, "utf8");
  const match = content.match(/^__version__ = "([^"]+)"/m);
  assert.ok(match, `Could not find __version__ in ${INIT}`);
  return match[1];
}

// dgk-lab-runtime lives outside the changesets pipeline, so its version is bumped
// by hand in two places. They must stay in sync or the published wheel reports a
// version that disagrees with `import dgk_lab_runtime; dgk_lab_runtime.__version__`.
test("dgk-lab-runtime version matches between pyproject.toml and __init__.py", () => {
  const pyproject = pyprojectVersion();
  const init = initVersion();
  assert.equal(
    init,
    pyproject,
    `Version drift: pyproject.toml is ${pyproject} but __init__.py is ${init}. ` +
      "Bump both packages/lab-runtime/pyproject.toml and " +
      "packages/lab-runtime/src/dgk_lab_runtime/__init__.py to the same value.",
  );
});

test("dgk-lab-runtime declares a stable semver version (no pre-release suffix)", () => {
  assert.match(
    pyprojectVersion(),
    STABLE_SEMVER,
    "dgk-lab-runtime version must be a stable x.y.z semver — set it to the last " +
      "stable release before tagging dgk-lab-runtime@X.Y.Z.",
  );
});

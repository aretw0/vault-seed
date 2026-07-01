import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const PYPROJECT = join(ROOT, "packages/lab-runtime/pyproject.toml");
const INIT = join(ROOT, "packages/lab-runtime/src/dgk_lab_runtime/__init__.py");

const STABLE_SEMVER = /^\d+\.\d+\.\d+$/;

function pyprojectVersion() {
  const content = readFileSync(PYPROJECT, "utf8");
  const match = content.match(/^version = "([^"]+)"/m);
  expect(match, `Could not find a version in ${PYPROJECT}`).toBeTruthy();
  return match[1];
}

function initVersion() {
  const content = readFileSync(INIT, "utf8");
  const match = content.match(/^__version__ = "([^"]+)"/m);
  expect(match, `Could not find __version__ in ${INIT}`).toBeTruthy();
  return match[1];
}

// dgk-lab-runtime lives outside the changesets pipeline, so its version is bumped
// by hand in two places. They must stay in sync or the published wheel reports a
// version that disagrees with `import dgk_lab_runtime; dgk_lab_runtime.__version__`.
test("dgk-lab-runtime version matches between pyproject.toml and __init__.py", () => {
  const pyproject = pyprojectVersion();
  const init = initVersion();
  expect(init, `Version drift: pyproject.toml is ${pyproject} but __init__.py is ${init}. ` +
      "Bump both packages/lab-runtime/pyproject.toml and " +
      "packages/lab-runtime/src/dgk_lab_runtime/__init__.py to the same value.").toBe(pyproject);
});

test("dgk-lab-runtime declares a stable semver version (no pre-release suffix)", () => {
  expect(pyprojectVersion(), "dgk-lab-runtime version must be a stable x.y.z semver — set it to the last " +
      "stable release before tagging dgk-lab-runtime@X.Y.Z.").toMatch(STABLE_SEMVER);
});

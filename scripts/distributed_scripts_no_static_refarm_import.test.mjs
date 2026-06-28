import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Scripts referenced by package.template.json ship to template users, who do not
// have unpublished @refarm.dev/* packages. They must load such packages via
// optional dynamic import(), never a static `import ... from "@refarm.dev/..."`.
test("template-distributed scripts must not statically import @refarm.dev/*", () => {
  const template = JSON.parse(readFileSync(join(ROOT, "package.template.json"), "utf8"));
  const commands = Object.values(template.scripts || {}).join("\n");
  const scriptPaths = [
    ...new Set([...commands.matchAll(/scripts\/[\w.\-/]+\.(?:mjs|cjs|js)/g)].map((m) => m[0])),
  ];
  assert.ok(scriptPaths.length > 0, "expected package.template.json to reference scripts/");

  const offenders = [];
  for (const rel of scriptPaths) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf8");
    if (/^\s*import\b[^\n]*\bfrom\s+["']@refarm\.dev\//m.test(src)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `distributed scripts statically import @refarm.dev/*: ${offenders.join(", ")} — use optional dynamic import()`,
  );
});

import { test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPTS_DIR = join(ROOT, "scripts");

// Every script under scripts/ ships to template users (directly via
// package.template.json commands, or spawned by the dgk CLI). They must not
// statically import unpublished @refarm.dev/* packages — only optional dynamic
// import(). Test files (*.test.*) are dev-only and excluded. The detection
// matches `from "@refarm.dev/..."` across single- and multi-line static
// import/export-from; dynamic import("@refarm.dev/...") has no `from`, so it is allowed.
test("template-distributed scripts must not statically import @refarm.dev/*", () => {
  const scriptFiles = readdirSync(SCRIPTS_DIR).filter(
    (name) => /\.(mjs|cjs|js)$/.test(name) && !/\.test\./.test(name),
  );
  expect(scriptFiles.length > 0, "expected scripts/ to contain distributable scripts").toBeTruthy();

  const offenders = [];
  for (const name of scriptFiles) {
    const src = readFileSync(join(SCRIPTS_DIR, name), "utf8");
    if (/\bfrom\s+["']@refarm\.dev\//.test(src)) {
      offenders.push(`scripts/${name}`);
    }
  }
  expect(offenders, `distributed scripts statically import @refarm.dev/*: ${offenders.join(", ")} — use optional dynamic import()`).toEqual([]);
});

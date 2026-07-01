import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// Pacotes @aretw0/* publicáveis que carregam dep file:@refarm.dev/* DEVEM
// declarar o publish-hold para não vazarem no fluxo de release.
const PUBLISHABLE = [
  "packages/cli/package.json",
  "packages/dgk-runner/package.json",
  "packages/channels/package.json",
  "packages/dgk-astro-plugins/package.json",
];

test("pacotes publicáveis com dep file:@refarm.dev/* declaram release hold", () => {
  for (const p of PUBLISHABLE) {
    let pkg;
    try { pkg = readJson(p); } catch { continue; }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasFileRefarm = Object.entries(deps).some(
      ([name, spec]) => name.startsWith("@refarm.dev/") && String(spec).startsWith("file:"),
    );
    if (hasFileRefarm) {
      expect(pkg.dgk?.releaseHold, `${p} carrega dep file:@refarm.dev/* — precisa de "dgk.releaseHold":"refarm-unpublished"`).toBe("refarm-unpublished");
    }
  }
});

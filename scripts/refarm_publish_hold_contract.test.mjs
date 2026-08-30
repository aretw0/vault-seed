import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// Pacotes @aretw0/* publicáveis que carregam dep file:@refarm.dev/* DEVEM
// declarar o publish-hold para não vazarem no fluxo de release
// (scripts/release_package_smoke.mjs pula quem tem dgk.releaseHold).
// A lista vem do disco, não de nomes fixos: um pacote renomeado não pode
// sair do guard em silêncio.
const publishable = readdirSync(join(ROOT, "packages"))
  .map((dir) => `packages/${dir}/package.json`)
  .filter((p) => {
    try {
      return readJson(p).private !== true;
    } catch {
      return false;
    }
  });

test("há pacotes publicáveis em packages/", () => {
  expect(publishable.length).toBeGreaterThan(0);
});

test("pacotes publicáveis com dep file:@refarm.dev/* declaram release hold", () => {
  for (const p of publishable) {
    const pkg = readJson(p);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasFileRefarm = Object.entries(deps).some(
      ([name, spec]) => name.startsWith("@refarm.dev/") && String(spec).startsWith("file:"),
    );
    if (hasFileRefarm) {
      expect(pkg.dgk?.releaseHold, `${p} carrega dep file:@refarm.dev/* — precisa de "dgk.releaseHold":"refarm-unpublished"`).toBe("refarm-unpublished");
    }
  }
});

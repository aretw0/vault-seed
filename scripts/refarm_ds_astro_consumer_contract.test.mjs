import { test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import {
  dsAstroComponents,
  dsAstroCssImports,
  mdxComponents,
} from "@refarm.dev/ds-astro";

// vault-seed consumes @refarm.dev/ds-astro as the sanctioned Astro/MDX embed set over the DS
// classes/CSS, so published MDX notes render reusable DS blocks instead of vault-owned astro
// block packages. Product-specific MDX copy and route semantics stay downstream.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/ds-astro";
const TGZ = "file:vendor/refarm.dev-ds-astro-0.1.0.tgz";
const PKG_DIR = join(ROOT, "node_modules", PKG);

test("vault-seed pins @refarm.dev/ds-astro via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe(TGZ);
});

test("the consumed ds-astro surface is exported", () => {
  const dts = readFileSync(join(PKG_DIR, "dist", "index.d.ts"), "utf8");
  for (const name of [
    "dsAstroComponents",
    "dsAstroCssImports",
    "mdxComponents",
    "DsAstroComponentName",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

// Adoption proof: vault-seed builds its published-MDX component map from the block instead of
// local astro block packages. Every sanctioned name must map to a real package subpath file, so
// an MDX `import Card from "@refarm.dev/ds-astro/Card.astro"` resolves to shipped bytes.
test("the sanctioned MDX component map resolves to real .astro files", () => {
  expect([...dsAstroComponents]).toEqual([
    "Card",
    "MetricStrip",
    "CalloutSection",
    "ContentList",
  ]);
  for (const name of dsAstroComponents) {
    expect(mdxComponents[name], `${name} maps to a package subpath`).toBe(`${PKG}/${name}.astro`);
    const file = join(PKG_DIR, "src", `${name}.astro`);
    expect(existsSync(file), `missing shipped component ${file}`).toBe(true);
  }
});

// The block carries the DS CSS an MDX page needs (tokens + theme + components), so the vault keeps
// no bespoke DS stylesheet wiring — it stays a thin binding over @refarm.dev/ds.
test("ds-astro declares the DS css imports for MDX pages", () => {
  expect(dsAstroCssImports).toContain("@refarm.dev/ds/tokens.css");
  expect(dsAstroCssImports).toHaveLength(3);
  for (const spec of dsAstroCssImports) {
    expect(spec.startsWith("@refarm.dev/ds/"), `css import stays over ds: ${spec}`).toBe(true);
  }
});

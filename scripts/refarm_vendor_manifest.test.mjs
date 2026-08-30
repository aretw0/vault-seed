import { test, expect } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

// Os tarballs @refarm.dev/* em vendor/ são rastreados no git durante a transição
// (até o refarm publicar no npm). vendor/manifest.json registra de qual packet
// eles vieram (sourceGitSha + data) e o sha256 de cada um. Este teste falha cedo
// se os bytes divergirem do manifest, se sobrar tarball fora do manifest, ou se
// alguma ref file: (package.json, packages/*/package.json, overrides) apontar
// para um tarball que não está vendorizado.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VENDOR = join(ROOT, "vendor");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const manifest = readJson(join(VENDOR, "manifest.json"));
const listed = new Map(manifest.packages.map((p) => [p.tarball, p]));

test("vendor/manifest.json identifica o packet de origem", () => {
  expect(manifest.sourceGitSha).toMatch(/^[0-9a-f]{40}$/);
  expect(manifest.packetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(manifest.packages.length).toBeGreaterThan(0);
  for (const p of manifest.packages) {
    expect(p.packageName, p.tarball).toMatch(/^@refarm\.dev\//);
    expect(p.sha256, p.tarball).toMatch(/^[0-9a-f]{64}$/);
    expect(["direct", "transitive"], p.tarball).toContain(p.role);
  }
});

test("cada tarball do manifest existe em vendor/ com o sha256 registrado", () => {
  for (const p of manifest.packages) {
    const path = join(VENDOR, p.tarball);
    expect(sha256(path), `${p.tarball}: bytes divergem do manifest`).toBe(p.sha256);
  }
});

test("nenhum tarball em vendor/ fica fora do manifest", () => {
  const onDisk = readdirSync(VENDOR).filter((f) => f.endsWith(".tgz")).sort();
  expect(onDisk).toEqual([...listed.keys()].sort());
});

test("toda ref file:@refarm.dev/* aponta para um tarball do manifest", () => {
  const refs = [];
  const collect = (label, deps) => {
    for (const [name, spec] of Object.entries(deps ?? {})) {
      if (name.startsWith("@refarm.dev/") && String(spec).startsWith("file:")) {
        refs.push({ label, name, tarball: String(spec).split("/").at(-1) });
      }
    }
  };
  const root = readJson(join(ROOT, "package.json"));
  collect("package.json", { ...root.dependencies, ...root.devDependencies });
  for (const dir of readdirSync(join(ROOT, "packages"))) {
    let pkg;
    try {
      pkg = readJson(join(ROOT, "packages", dir, "package.json"));
    } catch {
      continue;
    }
    collect(`packages/${dir}/package.json`, { ...pkg.dependencies, ...pkg.devDependencies });
  }
  const workspace = YAML.parse(readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8"));
  collect("pnpm-workspace.yaml", workspace.overrides);

  expect(refs.length).toBeGreaterThan(0);
  for (const ref of refs) {
    const entry = listed.get(ref.tarball);
    expect(entry, `${ref.label}: ${ref.name} -> ${ref.tarball} não está em vendor/manifest.json`).toBeDefined();
    expect(entry.packageName, `${ref.label}: ${ref.tarball}`).toBe(ref.name);
  }

  // Os overrides são exatamente o conjunto vendorizado: nada a mais (pacote que
  // ninguém consome), nada a menos (transitivo sem pin).
  const overridden = Object.keys(workspace.overrides ?? {}).filter((n) => n.startsWith("@refarm.dev/")).sort();
  expect(overridden).toEqual(manifest.packages.map((p) => p.packageName).sort());
});

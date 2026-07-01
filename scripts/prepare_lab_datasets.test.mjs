import { test, expect } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildLabDatasets, readManifest } from "./prepare_lab_datasets.mjs";

test("readManifest accepts UTF-8 BOM", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-etl-"));
  const manifestPath = join(cwd, "lab.datasets.json");
  writeFileSync(manifestPath, "\uFEFF" + JSON.stringify([{ id: "bom", runtimeUrl: "https://example.com/bom.json" }]), "utf8");

  expect(readManifest(manifestPath)).toEqual([{ id: "bom", runtimeUrl: "https://example.com/bom.json" }]);
});

test("buildLabDatasets copies local snapshots to root and WASM asset paths", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-etl-"));
  const targetRoot = join(cwd, "public", "lab");
  writeFileSync(join(cwd, "source.json"), JSON.stringify({ ok: true }), "utf8");

  const { data } = buildLabDatasets({
    cwd,
    targetRoot,
    manifest: [
      {
        id: "exemplo",
        title: "Exemplo",
        source: "source.json",
        output: "exemplo.json",
        format: "json",
      },
    ],
  });

  expect(data.datasetCount).toBe(1);
  expect(data.datasets[0].kind).toBe("snapshot");
  expect(data.datasets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(readFileSync(join(targetRoot, "datasets", "exemplo.json"), "utf8")).toBe('{"ok":true}');
  expect(readFileSync(join(targetRoot, "assets", "datasets", "exemplo.json"), "utf8")).toBe('{"ok":true}');
  expect(JSON.parse(readFileSync(join(targetRoot, "assets", "datasets", "manifest.json"), "utf8")).datasetCount).toBe(1);
});

test("buildLabDatasets records runtime datasets without fetching them", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-etl-"));
  const targetRoot = join(cwd, "public", "lab");
  const { data } = buildLabDatasets({
    cwd,
    targetRoot,
    manifest: [
      {
        id: "remoto",
        title: "Remoto",
        output: "remoto.json",
        runtimeUrl: "https://example.com/data.json",
        format: "json",
      },
    ],
  });

  expect(data.datasets[0].kind).toBe("runtime");
  expect(data.datasets[0].url).toBe("https://example.com/data.json");
});

test("buildLabDatasets rejects path traversal", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-etl-"));
  expect(() =>
      buildLabDatasets({
        cwd,
        targetRoot: join(cwd, "public", "lab"),
        manifest: [{ id: "escape", source: "../secret.json" }],
      })).toThrow(/source do dataset escape inválido/);
});

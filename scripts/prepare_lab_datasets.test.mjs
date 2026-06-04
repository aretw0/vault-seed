import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildLabDatasets } from "./prepare_lab_datasets.mjs";

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

  assert.equal(data.datasetCount, 1);
  assert.equal(data.datasets[0].kind, "snapshot");
  assert.match(data.datasets[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(readFileSync(join(targetRoot, "datasets", "exemplo.json"), "utf8"), '{"ok":true}');
  assert.equal(readFileSync(join(targetRoot, "assets", "datasets", "exemplo.json"), "utf8"), '{"ok":true}');
  assert.equal(JSON.parse(readFileSync(join(targetRoot, "assets", "datasets", "manifest.json"), "utf8")).datasetCount, 1);
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

  assert.equal(data.datasets[0].kind, "runtime");
  assert.equal(data.datasets[0].url, "https://example.com/data.json");
});

test("buildLabDatasets rejects path traversal", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-etl-"));
  assert.throws(
    () =>
      buildLabDatasets({
        cwd,
        targetRoot: join(cwd, "public", "lab"),
        manifest: [{ id: "escape", source: "../secret.json" }],
      }),
    /source do dataset escape inválido/,
  );
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isUpToDate, applyUpdates } from "./sync_lockfile_template.mjs";

const PKG_CLI = "@aretw0/dgk-cli";
const PKG_CHANNELS = "@aretw0/dgk-channels";

const FIXTURE_VERSION = "0.2.0";
const FIXTURE_INTEGRITY = "sha512-abc123XYZfakeIntegrity==";

// Minimal lockfile mirroring pnpm-lock.template.yaml with both DGK packages
const FIXTURE = `\
lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      '@aretw0/dgk-channels':
        specifier: latest
        version: 0.1.0
      '@aretw0/dgk-cli':
        specifier: latest
        version: 0.1.1

packages:

  '@aretw0/dgk-channels@0.1.0':
    resolution: {integrity: sha512-CHANNELSoldintegrity==}
    engines: {node: '>=22'}

  '@aretw0/dgk-cli@0.1.1':
    resolution: {integrity: sha512-OLDintegrity==}
    engines: {node: '>=22'}
    hasBin: true

snapshots:

  '@aretw0/dgk-channels@0.1.0': {}

  '@aretw0/dgk-cli@0.1.1': {}
`;

describe("isUpToDate", () => {
  test("retorna false quando versão está desatualizada", () => {
    assert.equal(isUpToDate(FIXTURE, PKG_CLI, "0.2.0", "sha512-OLDintegrity=="), false);
  });

  test("retorna false quando integrity está desatualizado", () => {
    const withNewVersion = FIXTURE.replace(/0\.1\.1/g, "0.2.0");
    assert.equal(isUpToDate(withNewVersion, PKG_CLI, "0.2.0", "sha512-NEWintegrity=="), false);
  });

  test("retorna true quando versão e integrity batem", () => {
    const updated = applyUpdates(FIXTURE, PKG_CLI, "0.2.0", "sha512-NEWintegrity==");
    assert.equal(isUpToDate(updated, PKG_CLI, "0.2.0", "sha512-NEWintegrity=="), true);
  });

  test("retorna true para dgk-channels quando versão e integrity batem", () => {
    const updated = applyUpdates(FIXTURE, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels==");
    assert.equal(isUpToDate(updated, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels=="), true);
  });
});

describe("applyUpdates", () => {
  test("atualiza a versão no importer (version: X.Y.Z)", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    assert.ok(
      result.includes(`version: ${FIXTURE_VERSION}`),
      "importer version deve ser atualizado",
    );
    assert.ok(!result.includes("version: 0.1.1"), "versão antiga não deve restar no importer");
  });

  test("atualiza a chave do packages entry", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    assert.ok(
      result.includes(`'@aretw0/dgk-cli@${FIXTURE_VERSION}':`),
      "packages entry deve ter nova versão",
    );
    assert.ok(
      !result.includes("'@aretw0/dgk-cli@0.1.1':"),
      "packages entry antiga não deve restar",
    );
  });

  test("atualiza a chave do snapshots entry", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    assert.ok(
      result.includes(`'@aretw0/dgk-cli@${FIXTURE_VERSION}': {}`),
      "snapshots entry deve ter nova versão",
    );
  });

  test("atualiza o integrity hash", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    assert.ok(
      result.includes(`{integrity: ${FIXTURE_INTEGRITY}}`),
      "integrity deve ser atualizado",
    );
    assert.ok(!result.includes("sha512-OLDintegrity=="), "integrity antigo não deve restar");
  });

  test("atualiza dgk-channels sem afetar dgk-cli", () => {
    const result = applyUpdates(FIXTURE, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels==");
    assert.ok(result.includes("'@aretw0/dgk-channels@0.2.0':"), "channels deve ser atualizado");
    assert.ok(result.includes("'@aretw0/dgk-cli@0.1.1':"), "cli não deve ser alterado");
    assert.ok(result.includes("sha512-OLDintegrity=="), "integrity do cli não deve mudar");
  });

  test("atualiza dgk-cli sem afetar dgk-channels", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, "0.2.0", "sha512-NEWcli==");
    assert.ok(result.includes("'@aretw0/dgk-cli@0.2.0':"), "cli deve ser atualizado");
    assert.ok(result.includes("'@aretw0/dgk-channels@0.1.0':"), "channels não deve ser alterado");
    assert.ok(result.includes("sha512-CHANNELSoldintegrity=="), "integrity do channels não deve mudar");
  });

  test("conteúdo sem o pacote não é alterado", () => {
    const unrelated = "lockfileVersion: '9.0'\n\nimporters:\n  .:\n    dependencies: {}\n";
    const result = applyUpdates(unrelated, PKG_CLI, "1.0.0", "sha512-xyz==");
    assert.equal(result, unrelated, "conteúdo sem o pacote não deve ser modificado");
  });

  test("idempotente: aplicar duas vezes com mesma versão não altera o resultado", () => {
    const once = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    const twice = applyUpdates(once, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    assert.equal(once, twice, "deve ser idempotente");
  });
});

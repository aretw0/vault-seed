import { describe, test, expect } from "vitest";
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
    expect(isUpToDate(FIXTURE, PKG_CLI, "0.2.0", "sha512-OLDintegrity==")).toBe(false);
  });

  test("retorna false quando integrity está desatualizado", () => {
    const withNewVersion = FIXTURE.replace(/0\.1\.1/g, "0.2.0");
    expect(isUpToDate(withNewVersion, PKG_CLI, "0.2.0", "sha512-NEWintegrity==")).toBe(false);
  });

  test("retorna true quando versão e integrity batem", () => {
    const updated = applyUpdates(FIXTURE, PKG_CLI, "0.2.0", "sha512-NEWintegrity==");
    expect(isUpToDate(updated, PKG_CLI, "0.2.0", "sha512-NEWintegrity==")).toBe(true);
  });

  test("retorna true para dgk-channels quando versão e integrity batem", () => {
    const updated = applyUpdates(FIXTURE, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels==");
    expect(isUpToDate(updated, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels==")).toBe(true);
  });
});

describe("applyUpdates", () => {
  test("atualiza a versão no importer (version: X.Y.Z)", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    expect(result.includes(`version: ${FIXTURE_VERSION}`), "importer version deve ser atualizado").toBeTruthy();
    expect(!result.includes("version: 0.1.1"), "versão antiga não deve restar no importer").toBeTruthy();
  });

  test("atualiza a chave do packages entry", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    expect(result.includes(`'@aretw0/dgk-cli@${FIXTURE_VERSION}':`), "packages entry deve ter nova versão").toBeTruthy();
    expect(!result.includes("'@aretw0/dgk-cli@0.1.1':"), "packages entry antiga não deve restar").toBeTruthy();
  });

  test("atualiza a chave do snapshots entry", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    expect(result.includes(`'@aretw0/dgk-cli@${FIXTURE_VERSION}': {}`), "snapshots entry deve ter nova versão").toBeTruthy();
  });

  test("atualiza o integrity hash", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    expect(result.includes(`{integrity: ${FIXTURE_INTEGRITY}}`), "integrity deve ser atualizado").toBeTruthy();
    expect(!result.includes("sha512-OLDintegrity=="), "integrity antigo não deve restar").toBeTruthy();
  });

  test("atualiza dgk-channels sem afetar dgk-cli", () => {
    const result = applyUpdates(FIXTURE, PKG_CHANNELS, "0.2.0", "sha512-NEWchannels==");
    expect(result.includes("'@aretw0/dgk-channels@0.2.0':"), "channels deve ser atualizado").toBeTruthy();
    expect(result.includes("'@aretw0/dgk-cli@0.1.1':"), "cli não deve ser alterado").toBeTruthy();
    expect(result.includes("sha512-OLDintegrity=="), "integrity do cli não deve mudar").toBeTruthy();
  });

  test("atualiza dgk-cli sem afetar dgk-channels", () => {
    const result = applyUpdates(FIXTURE, PKG_CLI, "0.2.0", "sha512-NEWcli==");
    expect(result.includes("'@aretw0/dgk-cli@0.2.0':"), "cli deve ser atualizado").toBeTruthy();
    expect(result.includes("'@aretw0/dgk-channels@0.1.0':"), "channels não deve ser alterado").toBeTruthy();
    expect(result.includes("sha512-CHANNELSoldintegrity=="), "integrity do channels não deve mudar").toBeTruthy();
  });

  test("conteúdo sem o pacote não é alterado", () => {
    const unrelated = "lockfileVersion: '9.0'\n\nimporters:\n  .:\n    dependencies: {}\n";
    const result = applyUpdates(unrelated, PKG_CLI, "1.0.0", "sha512-xyz==");
    expect(result, "conteúdo sem o pacote não deve ser modificado").toBe(unrelated);
  });

  test("idempotente: aplicar duas vezes com mesma versão não altera o resultado", () => {
    const once = applyUpdates(FIXTURE, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    const twice = applyUpdates(once, PKG_CLI, FIXTURE_VERSION, FIXTURE_INTEGRITY);
    expect(once, "deve ser idempotente").toBe(twice);
  });
});

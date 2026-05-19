const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseWikiTarget,
  validateOnboarding,
} = require("./validate_onboarding");

function makeVault(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vault-seed-test-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  return root;
}

test("parseWikiTarget removes aliases and headings", () => {
  assert.equal(parseWikiTarget("Nota Principal|apelido"), "Nota Principal");
  assert.equal(parseWikiTarget("Nota Principal#Secao"), "Nota Principal");
  assert.equal(parseWikiTarget("https://example.com"), null);
});

test("validateOnboarding reports missing required files", () => {
  const root = makeVault({
    "README.md": "[[Nota Existente]]",
    "Nota Existente.md": "ok",
  });

  const result = validateOnboarding(root);

  assert.ok(
    result.errors.some((error) =>
      error.includes("Missing required onboarding file: AGENTS.md"),
    ),
  );
});

test("validateOnboarding catches unresolved wikilinks in entrypoints", () => {
  const requiredFiles = {
    "README.md": "[[Nota Inexistente]]",
    "AGENTS.md": "ok",
    "CLAUDE.md": "@AGENTS.md",
    "GEMINI.md": "ok",
    "99 - Meta & Attachments/Guia do Jardineiro Digital.md": "ok",
    "99 - Meta & Attachments/Seus Primeiros Passos.md": "ok",
    "99 - Meta & Attachments/Exploracao Guiada do Vault.md": "ok",
    "99 - Meta & Attachments/Preparando seu Computador para o Vault.md": "ok",
    "99 - Meta & Attachments/Usando o Git e o GitHub para Sincronizar seu Vault.md":
      "ok",
    "99 - Meta & Attachments/Configurando o Obsidian Git.md": "ok",
    "99 - Meta & Attachments/Depois da Recepcao do Template.md": "ok",
    "99 - Meta & Attachments/MOC Vault Seed.md": "ok",
    "99 - Meta & Attachments/Vault Seed Kitchen Sink.base": "ok",
    "40 - Resources/O que sao system prompts de IA.md": "ok",
    "40 - Resources/Bases.md": "ok",
    "40 - Resources/Dataview.md": "ok",
  };

  const result = validateOnboarding(makeVault(requiredFiles));

  assert.deepEqual(result.errors, [
    "README.md: unresolved wikilink [[Nota Inexistente]]",
  ]);
});

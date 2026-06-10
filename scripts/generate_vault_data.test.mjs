import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildVaultData, slugify, writeVaultData } from "./generate_vault_data.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// --- slugify ---

test("slugify remove prefixo numérico de pasta", () => {
  assert.equal(slugify("00 - Entrada"), "entrada");
  assert.equal(slugify("40 - Recursos"), "recursos");
});

test("slugify normaliza acentos e caracteres especiais", () => {
  assert.equal(slugify("Jardim digital"), "jardim-digital");
  assert.equal(slugify("Noção básica"), "nocao-basica");
});

test("slugify preserva separadores de caminho", () => {
  const result = slugify("40 - Recursos/Jardim digital.md".replace(/\.md$/, ""));
  assert.equal(result, "recursos/jardim-digital");
});

test("slugify produz apenas caracteres URL-seguros", () => {
  const result = slugify("99 - Meta e Anexos/Notebooks/etl-demo");
  assert.match(result, /^[a-z0-9/-]+$/, "deve conter apenas letras, números, hífens e barras");
});

// --- buildVaultData ---

test("buildVaultData retorna schema correto com o vault real", () => {
  const result = buildVaultData({ cwd: ROOT });

  assert.ok("generated" in result, "deve ter campo generated");
  assert.ok("noteCount" in result, "deve ter campo noteCount");
  assert.ok(Array.isArray(result.notes), "notes deve ser array");
  assert.equal(result.noteCount, result.notes.length, "noteCount deve bater com notes.length");
  assert.match(result.generated, /^\d{4}-\d{2}-\d{2}T/, "generated deve ser ISO timestamp");
});

test("buildVaultData cada nota tem os campos de contrato obrigatórios", () => {
  const { notes } = buildVaultData({ cwd: ROOT });
  assert.ok(notes.length > 0, "vault deve ter pelo menos uma nota");

  for (const note of notes.slice(0, 5)) {
    assert.ok(typeof note.id === "string" && note.id.length > 0, `nota.id deve ser string: ${JSON.stringify(note)}`);
    assert.ok(typeof note.path === "string" && note.path.endsWith(".md"), `nota.path deve terminar em .md: ${note.id}`);
    assert.ok(typeof note.title === "string" && note.title.length > 0, `nota.title deve ser string: ${note.id}`);
    assert.ok(typeof note.folder === "string", `nota.folder deve ser string: ${note.id}`);
    assert.ok(Array.isArray(note.links), `nota.links deve ser array: ${note.id}`);
  }
});

test("buildVaultData funciona com diretório temporário com notas mínimas", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-gvd-"));

  // Cria estrutura mínima compatível com VAULT_FOLDERS
  const folder = "00 - Entrada";
  mkdirSync(join(cwd, folder), { recursive: true });
  writeFileSync(
    join(cwd, folder, "Nota de teste.md"),
    "---\ntitle: Nota de teste\nstatus: draft\n---\nConteúdo com [[link para outra]].\n",
    "utf8",
  );

  const result = buildVaultData({ cwd });

  assert.equal(result.noteCount, 1, "deve encontrar exatamente 1 nota");
  assert.equal(result.notes[0].title, "Nota de teste");
  assert.ok(result.notes[0].links.includes("link para outra"), "deve extrair wikilinks");
});

// --- writeVaultData ---

test("writeVaultData escreve vault-data.json no caminho correto", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-wvd-"));
  const folder = "00 - Entrada";
  mkdirSync(join(cwd, folder), { recursive: true });
  writeFileSync(
    join(cwd, folder, "Nota.md"),
    "---\ntitle: Nota\n---\n",
    "utf8",
  );

  const { data, outDir } = writeVaultData({ cwd, notebooksPath: "lab" });

  assert.ok(outDir.endsWith("public/lab") || outDir.endsWith("public\\lab"), "outDir deve ser public/lab");
  const written = JSON.parse(readFileSync(join(outDir, "vault-data.json"), "utf8"));
  assert.equal(written.noteCount, 1);
  assert.equal(data.notes.length, written.noteCount);
});

test("writeVaultData respeita notebooksPath alternativo", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-wvd-alt-"));
  mkdirSync(join(cwd, "00 - Entrada"), { recursive: true });
  writeFileSync(join(cwd, "00 - Entrada", "n.md"), "# n\n", "utf8");

  const { outDir } = writeVaultData({ cwd, notebooksPath: "studio" });

  assert.ok(
    outDir.endsWith("public/studio") || outDir.endsWith("public\\studio"),
    "outDir deve refletir notebooksPath customizado",
  );
});

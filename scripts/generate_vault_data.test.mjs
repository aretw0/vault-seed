import { test, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildVaultData, contentGlobPatterns, slugify, writeVaultData } from "./generate_vault_data.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// --- slugify ---

test("slugify remove prefixo numérico de pasta", () => {
  expect(slugify("00 - Entrada")).toBe("entrada");
  expect(slugify("40 - Recursos")).toBe("recursos");
});

test("slugify normaliza acentos e caracteres especiais", () => {
  expect(slugify("Jardim digital")).toBe("jardim-digital");
  expect(slugify("Noção básica")).toBe("nocao-basica");
});

test("slugify preserva separadores de caminho", () => {
  const result = slugify("40 - Recursos/Jardim digital.md".replace(/\.md$/, ""));
  expect(result).toBe("recursos/jardim-digital");
});

test("slugify produz apenas caracteres URL-seguros", () => {
  const result = slugify("99 - Meta e Anexos/Notebooks/etl-demo");
  expect(result, "deve conter apenas letras, números, hífens e barras").toMatch(/^[a-z0-9/-]+$/);
});

// --- buildVaultData ---

test("buildVaultData retorna schema correto com o vault real", () => {
  const result = buildVaultData({ cwd: ROOT });

  expect("generated" in result, "deve ter campo generated").toBeTruthy();
  expect("noteCount" in result, "deve ter campo noteCount").toBeTruthy();
  expect(Array.isArray(result.notes), "notes deve ser array").toBeTruthy();
  expect(result.noteCount, "noteCount deve bater com notes.length").toBe(result.notes.length);
  expect(result.generated, "generated deve ser ISO timestamp").toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("buildVaultData cada nota tem os campos de contrato obrigatórios", () => {
  const { notes } = buildVaultData({ cwd: ROOT });
  expect(notes.length > 0, "vault deve ter pelo menos uma nota").toBeTruthy();

  for (const note of notes.slice(0, 5)) {
    expect(typeof note.id === "string" && note.id.length > 0, `nota.id deve ser string: ${JSON.stringify(note)}`).toBeTruthy();
    expect(typeof note.path === "string" && /\.(md|mdx)$/i.test(note.path), `nota.path deve terminar em .md ou .mdx: ${note.id}`).toBeTruthy();
    expect(typeof note.title === "string" && note.title.length > 0, `nota.title deve ser string: ${note.id}`).toBeTruthy();
    expect(typeof note.folder === "string", `nota.folder deve ser string: ${note.id}`).toBeTruthy();
    expect(Array.isArray(note.links), `nota.links deve ser array: ${note.id}`).toBeTruthy();
  }
});

test("buildVaultData usa o mesmo glob para Markdown e MDX", () => {
  expect(contentGlobPatterns(["00 - Entrada"])).toEqual(["00 - Entrada/**/*.md", "00 - Entrada/**/*.mdx"]);
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

  expect(result.noteCount, "deve encontrar exatamente 1 nota").toBe(1);
  expect(result.notes[0].title).toBe("Nota de teste");
  expect(result.notes[0].links.includes("link para outra"), "deve extrair wikilinks").toBeTruthy();
});

test("buildVaultData projeta MDX no mesmo contrato das notas Markdown", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-gvd-mdx-"));
  const folder = "00 - Entrada";
  mkdirSync(join(cwd, folder), { recursive: true });
  writeFileSync(
    join(cwd, folder, "Nota MDX.mdx"),
    "---\ntitle: Nota MDX\nstatus: published\ntags: [mdx]\n---\n<Callout />\n\nConteúdo com [[Nota Markdown]].\n",
    "utf8",
  );
  writeFileSync(
    join(cwd, folder, "Nota Markdown.md"),
    "---\ntitle: Nota Markdown\nstatus: published\n---\nConteúdo comum.\n",
    "utf8",
  );

  const result = buildVaultData({ cwd });
  const mdx = result.notes.find((note) => note.path.endsWith(".mdx"));

  expect(result.noteCount, "deve encontrar Markdown e MDX").toBe(2);
  expect(mdx?.id).toBe("entrada/nota-mdx");
  expect(mdx?.title).toBe("Nota MDX");
  expect(mdx?.tags).toEqual(["mdx"]);
  expect(mdx?.links).toEqual(["Nota Markdown"]);
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

  expect(outDir.endsWith("public/lab") || outDir.endsWith("public\\lab"), "outDir deve ser public/lab").toBeTruthy();
  const written = JSON.parse(readFileSync(join(outDir, "vault-data.json"), "utf8"));
  expect(written.noteCount).toBe(1);
  expect(data.notes.length).toBe(written.noteCount);
});

test("writeVaultData respeita notebooksPath alternativo", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-seed-wvd-alt-"));
  mkdirSync(join(cwd, "00 - Entrada"), { recursive: true });
  writeFileSync(join(cwd, "00 - Entrada", "n.md"), "# n\n", "utf8");

  const { outDir } = writeVaultData({ cwd, notebooksPath: "studio" });

  expect(outDir.endsWith("public/studio") || outDir.endsWith("public\\studio"), "outDir deve refletir notebooksPath customizado").toBeTruthy();
});

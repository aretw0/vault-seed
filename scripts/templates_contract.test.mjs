import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const templatesDir = path.join("90 - Modelos");

function templateFiles() {
  return fs
    .readdirSync(templatesDir)
    .filter((file) => file.endsWith(".md"))
    .sort();
}

function readTemplate(file) {
  return fs.readFileSync(path.join(templatesDir, file), "utf8");
}

test("starter templates use the core Obsidian Templates contract", () => {
  const files = templateFiles();
  expect(files).toEqual([
    "Template - Dashboard.md",
    "Template - Item de Feed.md",
    "Template - MOC.md",
    "Template - Nota Conceitual.md",
    "Template - Nota Diaria.md",
    "Template - Plano de Ação.md",
    "Template - Post Externo.md",
    "Template - Prompt.md",
  ]);

  for (const file of files) {
    const raw = readTemplate(file);
    const parsed = matter(raw);

    expect(typeof parsed.data.title, `${file}: missing title`).toBe("string");
    expect(String(parsed.data.created), `${file}: should use {{date}}`).toMatch(/\{\{date\}\}/);
    expect(parsed.data.status, `${file}: should default to draft`).toBe("draft");
    expect(typeof parsed.data.category, `${file}: missing category`).toBe("string");
    expect(raw, `${file}: should not require Templater syntax`).not.toMatch(/<%[\s\S]*?%>/);
    expect(raw, `${file}: should not ship placeholder wikilinks`).not.toMatch(/\[\[[^\]]*(relevante|relacionad[ao]|adicional)[^\]]*\]\]/i);
  }
});

test("template guide lists the actual starter templates", () => {
  const guide = fs.readFileSync("99 - Meta e Anexos/99.3 - Referência/Usando o Plugin Templates.md", "utf8");

  for (const file of templateFiles()) {
    expect(guide, `${file} is missing from the guide`).toMatch(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  expect(guide).not.toMatch(/Documentação de Prompt|Documentacao de Prompt/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");

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
  assert.deepEqual(files, [
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

    assert.equal(typeof parsed.data.title, "string", `${file}: missing title`);
    assert.match(String(parsed.data.created), /\{\{date\}\}/, `${file}: should use {{date}}`);
    assert.equal(parsed.data.status, "draft", `${file}: should default to draft`);
    assert.equal(typeof parsed.data.category, "string", `${file}: missing category`);
    assert.doesNotMatch(raw, /<%[\s\S]*?%>/, `${file}: should not require Templater syntax`);
    assert.doesNotMatch(raw, /\[\[[^\]]*(relevante|relacionad[ao]|adicional)[^\]]*\]\]/i, `${file}: should not ship placeholder wikilinks`);
  }
});

test("template guide lists the actual starter templates", () => {
  const guide = fs.readFileSync("99 - Meta e Anexos/99.3 - Referência/Usando o Plugin Templates.md", "utf8");

  for (const file of templateFiles()) {
    assert.match(guide, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${file} is missing from the guide`);
  }

  assert.doesNotMatch(guide, /Documentação de Prompt|Documentacao de Prompt/);
});

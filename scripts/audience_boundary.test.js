const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("README separates generated-vault users from template contributors", () => {
  const readme = read("README.md");

  const userStart = readme.indexOf("## Para Quem Quer Criar Um Vault");
  const firstSteps = readme.indexOf("## Primeiros Passos");
  const maintainerStart = readme.indexOf("## Para Contribuidores Do Template");

  assert.ok(userStart > 0, "README needs a generated-vault user section");
  assert.ok(firstSteps > userStart, "first steps should remain in the user surface");
  assert.ok(maintainerStart > firstSteps, "template contributor material should follow user onboarding");
  assert.match(readme, /Contribuidores trabalham no template original/);
  assert.match(readme, /Usuários que geraram um vault a partir dele/);
  assert.doesNotMatch(readme, /incr[ií]vel|estado da arte|liberar o potencial|jornada/i);
});

test("technical docs index states user versus template-maintainer entrypoints", () => {
  const index = read("docs/INDEX.md");

  assert.match(index, /documentacao operacional do projeto `vault-seed`/);
  assert.match(index, /Para aprender a usar o vault como sistema de conhecimento/);
  assert.match(index, /Como evitar drift/);
});

test("GitHub-facing entrypoints use markdown links instead of vault-only wikilinks", () => {
  for (const file of [
    "README.md",
    "README.template.md",
    "docs/gerenciando-segredos-com-git.md",
    "docs/organizacao-do-projeto.md",
  ]) {
    assert.doesNotMatch(read(file), /\[\[/, `${file} should render cleanly on GitHub`);
  }
});

test("public positioning avoids inflated framework language", () => {
  for (const file of [
    "README.md",
    "README.template.md",
    ".site/pages/index.astro",
    "99 - Meta e Anexos/Identidade Visual e Blocos de Interface.md",
  ]) {
    assert.doesNotMatch(
      read(file),
      /framework\s+t[ií]mido|\bframework\b/i,
      `${file} should describe vault-seed as a base/template, not a framework`,
    );
  }
});

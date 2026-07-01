import { test, expect } from "vitest";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("README separates generated-vault users from template contributors", () => {
  const readme = read("README.md");

  const userStart = readme.indexOf("## Para Quem Quer Criar Um Vault");
  const firstSteps = readme.indexOf("## Primeiros Passos");
  const maintainerStart = readme.indexOf("## Para Contribuidores Do Template");

  expect(userStart > 0, "README needs a generated-vault user section").toBeTruthy();
  expect(firstSteps > userStart, "first steps should remain in the user surface").toBeTruthy();
  expect(maintainerStart > firstSteps, "template contributor material should follow user onboarding").toBeTruthy();
  expect(readme).toMatch(/Contribuidores trabalham no template original/);
  expect(readme).toMatch(/Usuários que geraram um vault a partir dele/);
  expect(readme).not.toMatch(/incr[ií]vel|estado da arte|liberar o potencial|jornada/i);
});

test("technical docs index states user versus template-maintainer entrypoints", () => {
  const index = read("docs/INDEX.md");

  expect(index).toMatch(/documenta[çc][aã]o operacional do projeto `vault-seed`/);
  expect(index).toMatch(/Para aprender a usar o vault como sistema de conhecimento/);
  expect(index).toMatch(/Como evitar drift/);
});

test("GitHub-facing entrypoints use markdown links instead of vault-only wikilinks", () => {
  for (const file of [
    "README.md",
    "README.template.md",
    "docs/gerenciando-segredos-com-git.md",
    "docs/organizacao-do-projeto.md",
  ]) {
    expect(read(file), `${file} should render cleanly on GitHub`).not.toMatch(/\[\[/);
  }
});

test("quality documentation points to the canonical validation gate", () => {
  const readme = read("README.md");
  const generatedReadme = read("README.template.md");
  const docsIndex = read("docs/INDEX.md");
  const lintGuide = read("docs/guia-de-lint.md");
  const localSetup = read("99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md");

  for (const [file, content] of [
    ["README.md", readme],
    ["README.template.md", generatedReadme],
    ["docs/INDEX.md", docsIndex],
    ["docs/guia-de-lint.md", lintGuide],
  ]) {
    expect(content, `${file} should point to the canonical validation gate`).toMatch(/pnpm run validate/);
  }

  expect(readme).toMatch(/auditoria da sidebar/);
  expect(generatedReadme).toMatch(/auditoria da arquitetura de informação/);
  expect(docsIndex).toMatch(/site:responsive/);
  expect(lintGuide).toMatch(/notas publicadas fora da navegação/);
  expect(localSetup).not.toMatch(/Template smoke passed/);
});

test("public positioning avoids inflated framework language", () => {
  for (const file of [
    "README.md",
    "README.template.md",
    ".github/PULL_REQUEST_TEMPLATE/feat-technical-enhancement.md",
    ".site/pages/index.astro",
    "99 - Meta e Anexos/99.3 - Referência/Identidade Visual e Blocos de Interface.md",
  ]) {
    expect(read(file), `${file} should describe vault-seed as a base/template, not a framework`).not.toMatch(/framework\s+t[ií]mido|\bframework\b/i);
  }
});

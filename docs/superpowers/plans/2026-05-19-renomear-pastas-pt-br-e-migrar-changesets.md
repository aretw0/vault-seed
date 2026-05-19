# Renomear Pastas PT-BR e Migrar Changesets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear as 8 pastas PARA do vault de inglês para português e migrar o monorepo do template de `standard-version` para `@changesets/cli`, em um PR atômico que passa todos os checks de CI.

**Architecture:** A migração changesets é feita primeiro (sem tocar pastas) para que o release workflow funcione antes do rename. Em seguida as pastas são renomeadas com `git mv` e todas as referências são atualizadas em lote. O lado do usuário (`package.template.json`) mantém `standard-version` — o vault do usuário é um único pacote pessoal, não um monorepo.

**Tech Stack:** pnpm, @changesets/cli, markdownlint-cli, Node.js test runner, git mv

---

## Mapa de arquivos

| Arquivo | Responsabilidade no plano |
|---|---|
| `pnpm-workspace.yaml` | Inclui root `.` no workspace para changesets gerenciar |
| `package.json` (root) | Remove `standard-version`; atualiza globs lint |
| `package.template.json` | Só atualiza globs lint — mantém `standard-version` |
| `.github/workflows/prepare-release-pr.yml` | Troca `standard-version` por `changeset version` |
| `.github/workflows/release.yml` | Lê versão de `package.json` em vez de `VERSION` |
| `VERSION` | Removido |
| `scripts/validate_onboarding.js` | Paths hardcoded → novos nomes |
| `scripts/validate_onboarding.test.js` | Assertions → novos nomes (atualizado ANTES do .js) |
| `.obsidian/daily-notes.json` | `folder` → `10 - Diário` |
| `.obsidian/plugins/templater-obsidian/data.json` | `templates_folder` → `90 - Modelos` |
| `.obsidian/workspace.json` | Referências a pastas antigas |
| `AGENTS.template.md` | Referências às pastas PARA |
| ~32 arquivos `.md` | Wikilinks, exemplos de código, paths explícitos |
| `docs/` (guias, specs, planos) | Referências às pastas antigas |
| `.changeset/<slug>.md` | Changeset `major` documentando a breaking change |

---

### Task 1: Migrar changesets — workspace e package.json root

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Delete: `VERSION`

- [ ] **Step 1: Atualizar `pnpm-workspace.yaml` para incluir o root**

```yaml
packages:
  - "."
  - "packages/*"
```

- [ ] **Step 2: Atualizar `package.json` — remover standard-version, manter changesets**

O arquivo completo após a mudança:

```json
{
  "name": "digital-gardening-kit",
  "version": "0.0.1",
  "description": "Kit de ferramentas para a jardinagem digital",
  "private": true,
  "repository": {
    "type": "git",
    "url": "https://github.com/aretw0/vault-seed.git"
  },
  "scripts": {
    "test": "node --test scripts/*.test.js",
    "format": "prettier --write \"**/*.md\"",
    "format:check": "prettier --check .",
    "lint:main": "markdownlint --config .markdownlint.json \"10 - Fleeting & Daily/**/*.md\" \"20 - Projects/**/*.md\" \"30 - Areas/**/*.md\" \"40 - Resources/**/*.md\" \"50 - Archives/**/*.md\" \"99 - Meta & Attachments/**/*.md\"",
    "lint:docs": "markdownlint --config docs/.markdownlint.json \"docs/**/*.md\"",
    "lint:templates": "markdownlint --config \"90 - Templates/.markdownlint.json\" \"90 - Templates/**/*.md\"",
    "lint": "pnpm run lint:main && pnpm run lint:docs && pnpm run lint:templates",
    "smoke:template": "node scripts/smoke_template.js",
    "validate:onboarding": "node scripts/validate_onboarding.js",
    "validate": "pnpm run lint && pnpm run test && pnpm run validate:onboarding && pnpm run smoke:template",
    "changeset": "changeset",
    "changeset:version": "changeset version",
    "changeset:publish": "changeset publish"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "devDependencies": {
    "@changesets/cli": "^2.0.0",
    "markdownlint-cli": "^0.45.0",
    "prettier": "^3.6.2"
  },
  "packageManager": "pnpm@11.1.3+sha512.c85357fe17ca12dd23dd7071822666dfd7e3cb76fe214e3370b5ea2fb34f2a231185509b63e717f3cd0acb38dd3f8d82bcd5e8172400ae678b70ea4fbed0896d",
  "engines": {
    "node": ">=22"
  }
}
```

Nota: os globs de lint ainda têm os nomes em inglês — serão atualizados na Task 6, após o rename das pastas.

- [ ] **Step 3: Remover `VERSION`**

```bash
git rm VERSION
```

- [ ] **Step 4: Instalar dependências (atualiza lockfile)**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` é atualizado (remove standard-version). Sem erros.

- [ ] **Step 5: Verificar que changeset conhece o root**

```bash
pnpm changeset status
```

Expected: `No unreleased changesets found` (ainda não há changesets — isso é esperado neste ponto).

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json pnpm-lock.yaml
git rm VERSION
git commit -m "chore: migrate root to changesets, remove standard-version"
```

---

### Task 2: Atualizar workflows de release

**Files:**
- Modify: `.github/workflows/prepare-release-pr.yml`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Atualizar `prepare-release-pr.yml` — trocar standard-version por changeset version**

Substituir o passo `Run standard-version` pelo passo abaixo. Substituir também **todas** as referências a `steps.standard_version.outputs.*` por `steps.changeset_version.outputs.*` no restante do arquivo.

Passo novo:

```yaml
      - name: Version packages
        id: changeset_version
        run: |
          set -euo pipefail
          pnpm changeset version
          version=$(node -p "require('./package.json').version")
          echo "version=$version" >> "$GITHUB_OUTPUT"
          branch_name="chore/prepare-release-$(date +%s)"
          echo "branch_name=$branch_name" >> "$GITHUB_OUTPUT"
```

O arquivo completo após a mudança:

```yaml
name: "Prepare Release PR"

on:
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  prepare-release:
    name: Prepare release pull request
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Checkout develop
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          ref: develop
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git user
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Verify branch is current
        run: |
          set -euo pipefail
          git fetch origin main develop --prune
          git status --short
          git rev-parse HEAD

      - name: Setup
        uses: ./.github/actions/setup

      - name: Validate release candidate
        run: pnpm run validate

      - name: Version packages
        id: changeset_version
        run: |
          set -euo pipefail
          pnpm changeset version
          version=$(node -p "require('./package.json').version")
          echo "version=$version" >> "$GITHUB_OUTPUT"
          branch_name="chore/prepare-release-$(date +%s)"
          echo "branch_name=$branch_name" >> "$GITHUB_OUTPUT"

      - name: Ensure release tag does not already exist
        run: |
          set -euo pipefail
          version="v${{ steps.changeset_version.outputs.version }}"
          if git ls-remote --exit-code --tags origin "$version" >/dev/null 2>&1; then
            echo "::error::Tag $version already exists on origin. Sync develop with main before preparing a new release."
            exit 1
          fi

      - name: Push release branch
        run: |
          set -euo pipefail
          git push origin "HEAD:${{ steps.changeset_version.outputs.branch_name }}"

      - name: Create release pull request
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          gh pr create \
            --base main \
            --head "${{ steps.changeset_version.outputs.branch_name }}" \
            --title "chore(release): v${{ steps.changeset_version.outputs.version }}" \
            --label "release" \
            --label "automação" \
            --body "This PR was automatically generated by the \`prepare-release-pr\` workflow.

          It promotes the latest changes from \`develop\` to \`main\` and includes a new version bump to **v${{ steps.changeset_version.outputs.version }}**.

          **Please review the full diff and the generated CHANGELOG before merging.**

          Once this PR is merged, the \`release.yml\` workflow will be triggered to automatically:
          1. Create the \`v${{ steps.changeset_version.outputs.version }}\` Git tag.
          2. Publish the final GitHub Release."
```

- [ ] **Step 2: Atualizar `release.yml` — ler versão de `package.json`**

Substituir a linha:

```bash
version="v$(cat VERSION)"
```

por:

```bash
version="v$(node -p "require('./package.json').version")"
```

O passo `Create and push Git tag` completo após a mudança:

```yaml
      - name: Create and push Git tag
        id: create_tag
        run: |
          set -euo pipefail
          version="v$(node -p "require('./package.json').version")"
          echo "version_tag=$version" >> "$GITHUB_OUTPUT"

          if git rev-parse "$version" >/dev/null 2>&1; then
            echo "::notice::Tag $version already exists locally."
          else
            git tag -a "$version" -m "Release $version"
          fi

          if git ls-remote --exit-code --tags origin "$version" >/dev/null 2>&1; then
            echo "::notice::Tag $version already exists on origin."
          else
            git push origin "$version"
          fi
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/prepare-release-pr.yml .github/workflows/release.yml
git commit -m "chore: update release workflows to use changeset version"
```

---

### Task 3: TDD — Escrever testes com novos nomes (antes de atualizar o script)

**Files:**
- Modify: `scripts/validate_onboarding.test.js`

- [ ] **Step 1: Atualizar o teste de wikilinks para usar os novos nomes de pasta**

No teste `"validateOnboarding catches unresolved wikilinks in entrypoints"`, substituir todas as chaves do objeto `requiredFiles` com caminhos antigos pelos novos:

```js
test("validateOnboarding catches unresolved wikilinks in entrypoints", () => {
  const requiredFiles = {
    "README.md": "[[Nota Inexistente]]",
    "AGENTS.md": "ok",
    "CLAUDE.md": "@AGENTS.md",
    "GEMINI.md": "ok",
    "99 - Meta e Anexos/Guia do Jardineiro Digital.md": "ok",
    "99 - Meta e Anexos/Seus Primeiros Passos.md": "ok",
    "99 - Meta e Anexos/Exploracao Guiada do Vault.md": "ok",
    "99 - Meta e Anexos/Preparando seu Computador para o Vault.md": "ok",
    "99 - Meta e Anexos/Usando o Git e o GitHub para Sincronizar seu Vault.md":
      "ok",
    "99 - Meta e Anexos/Configurando o Obsidian Git.md": "ok",
    "99 - Meta e Anexos/Depois da Recepcao do Template.md": "ok",
    "99 - Meta e Anexos/MOC Vault Seed.md": "ok",
    "99 - Meta e Anexos/Vault Seed Kitchen Sink.base": "ok",
    "40 - Recursos/O que sao system prompts de IA.md": "ok",
    "40 - Recursos/Bases.md": "ok",
    "40 - Recursos/Dataview.md": "ok",
  };

  const result = validateOnboarding(makeVault(requiredFiles));

  assert.deepEqual(result.errors, [
    "README.md: unresolved wikilink [[Nota Inexistente]]",
  ]);
});
```

- [ ] **Step 2: Rodar os testes — verificar que o novo teste FALHA**

```bash
pnpm run test
```

Expected: FAIL — `Missing required onboarding file: 99 - Meta & Attachments/...` (script ainda usa caminhos antigos)

- [ ] **Step 3: Commit do teste falhando**

```bash
git add scripts/validate_onboarding.test.js
git commit -m "test: update onboarding test for PT-BR folder names"
```

---

### Task 4: Renomear as 8 pastas com git mv

**Files:**
- Rename: todas as 8 pastas raiz

- [ ] **Step 1: Renomear as 8 pastas**

```bash
git mv "00 - Inbox" "00 - Entrada"
git mv "10 - Fleeting & Daily" "10 - Diário"
git mv "20 - Projects" "20 - Projetos"
git mv "30 - Areas" "30 - Áreas"
git mv "40 - Resources" "40 - Recursos"
git mv "50 - Archives" "50 - Arquivo"
git mv "90 - Templates" "90 - Modelos"
git mv "99 - Meta & Attachments" "99 - Meta e Anexos"
```

- [ ] **Step 2: Verificar que git rastreou os renames**

```bash
git status --short | head -20
```

Expected: linhas `R  "00 - Inbox/..." -> "00 - Entrada/..."` para cada pasta e seus arquivos.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat!: rename PARA folders to Portuguese"
```

---

### Task 5: Atualizar validate_onboarding.js — fazer os testes passarem

**Files:**
- Modify: `scripts/validate_onboarding.js`

- [ ] **Step 1: Atualizar `requiredPaths` com os novos nomes**

```js
const requiredPaths = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "99 - Meta e Anexos/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/Seus Primeiros Passos.md",
  "99 - Meta e Anexos/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta e Anexos/Configurando o Obsidian Git.md",
  "99 - Meta e Anexos/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/MOC Vault Seed.md",
  "99 - Meta e Anexos/Vault Seed Kitchen Sink.base",
  "40 - Recursos/O que sao system prompts de IA.md",
  "40 - Recursos/Bases.md",
  "40 - Recursos/Dataview.md",
];
```

- [ ] **Step 2: Atualizar `wikiLinkEntryPoints` com os novos nomes**

```js
const wikiLinkEntryPoints = [
  "README.md",
  "99 - Meta e Anexos/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta e Anexos/Configurando o Obsidian Git.md",
  "99 - Meta e Anexos/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/MOC Vault Seed.md",
  "99 - Meta e Anexos/Seus Primeiros Passos.md",
  "99 - Meta e Anexos/Entendendo a Estrutura de Pastas.md",
  "99 - Meta e Anexos/Evoluindo seu Vault com Links, Tags e MOCs.md",
  "99 - Meta e Anexos/Criando seu Painel de Controle (Dashboard).md",
  "40 - Recursos/Filosofia e Conceitos Fundamentais.md",
  "40 - Recursos/O que sao system prompts de IA.md",
  "40 - Recursos/Bases.md",
  "40 - Recursos/Dataview.md",
];
```

- [ ] **Step 3: Rodar os testes — verificar que PASSAM**

```bash
pnpm run test
```

Expected: PASS — `▶ validateOnboarding catches unresolved wikilinks in entrypoints`

- [ ] **Step 4: Commit**

```bash
git add scripts/validate_onboarding.js
git commit -m "fix: update onboarding validation paths to PT-BR folder names"
```

---

### Task 6: Atualizar globs de lint

**Files:**
- Modify: `package.json` (root)
- Modify: `package.template.json`

- [ ] **Step 1: Atualizar `lint:main` e `lint:templates` em `package.json` (root)**

```json
"lint:main": "markdownlint --config .markdownlint.json \"10 - Diário/**/*.md\" \"20 - Projetos/**/*.md\" \"30 - Áreas/**/*.md\" \"40 - Recursos/**/*.md\" \"50 - Arquivo/**/*.md\" \"99 - Meta e Anexos/**/*.md\"",
"lint:templates": "markdownlint --config \"90 - Modelos/.markdownlint.json\" \"90 - Modelos/**/*.md\"",
```

- [ ] **Step 2: Rodar lint para verificar que funciona**

```bash
pnpm run lint:main
pnpm run lint:templates
```

Expected: PASS (sem erros de lint). Se houver erros de lint nos arquivos `.md`, corrija-os — não são causados pelo rename.

- [ ] **Step 3: Atualizar `lint:main` e `lint:templates` em `package.template.json`**

```json
"lint:main": "markdownlint --config .markdownlint.json \"10 - Diário/**/*.md\" \"20 - Projetos/**/*.md\" \"30 - Áreas/**/*.md\" \"40 - Recursos/**/*.md\" \"50 - Arquivo/**/*.md\" \"99 - Meta e Anexos/**/*.md\"",
"lint:templates": "markdownlint --config \"90 - Modelos/.markdownlint.json\" \"90 - Modelos/**/*.md\"",
```

- [ ] **Step 4: Commit**

```bash
git add package.json package.template.json
git commit -m "fix: update lint globs to PT-BR folder names"
```

---

### Task 7: Atualizar configs do Obsidian

**Files:**
- Modify: `.obsidian/daily-notes.json`
- Modify: `.obsidian/plugins/templater-obsidian/data.json`
- Modify: `.obsidian/workspace.json`

- [ ] **Step 1: Atualizar `.obsidian/daily-notes.json`**

```json
{
  "folder": "10 - Diário"
}
```

- [ ] **Step 2: Atualizar `templates_folder` em `.obsidian/plugins/templater-obsidian/data.json`**

Localizar a linha com `"templates_folder"` e alterar:

```json
"templates_folder": "90 - Modelos",
```

- [ ] **Step 3: Atualizar `.obsidian/workspace.json`**

Substituir `"40 - Resources/Bases.md"` por `"40 - Recursos/Bases.md"` no campo `"file"` do estado do leaf aberto:

```json
"file": "40 - Recursos/Bases.md",
```

- [ ] **Step 4: Commit**

```bash
git add .obsidian/daily-notes.json .obsidian/plugins/templater-obsidian/data.json .obsidian/workspace.json
git commit -m "fix: update Obsidian config paths to PT-BR folder names"
```

---

### Task 8: Atualizar AGENTS.template.md

**Files:**
- Modify: `AGENTS.template.md`

- [ ] **Step 1: Substituir todas as referências às pastas no arquivo**

Localizar e substituir no arquivo `AGENTS.template.md`:

| Buscar | Substituir |
|---|---|
| `00 - Inbox/` | `00 - Entrada/` |
| `10 - Fleeting & Daily/` | `10 - Diário/` |
| `20 - Projects/` | `20 - Projetos/` |
| `30 - Areas/` | `30 - Áreas/` |
| `40 - Resources/` | `40 - Recursos/` |
| `50 - Archives/` | `50 - Arquivo/` |
| `90 - Templates/` | `90 - Modelos/` |
| `99 - Meta & Attachments/` | `99 - Meta e Anexos/` |

- [ ] **Step 2: Commit**

```bash
git add AGENTS.template.md
git commit -m "fix: update AGENTS.template.md folder references to PT-BR"
```

---

### Task 9: Atualizar em lote os arquivos .md do vault

**Files:**
- Modify: todos os ~32 arquivos `.md` com referências às pastas antigas

- [ ] **Step 1: Rodar script Node de substituição em lote**

Criar e executar o script inline abaixo (não commitar o script — é descartável):

```bash
node -e "
const fs = require('fs');
const path = require('path');

const replacements = [
  ['99 - Meta & Attachments', '99 - Meta e Anexos'],
  ['50 - Archives', '50 - Arquivo'],
  ['40 - Resources', '40 - Recursos'],
  ['30 - Areas', '30 - Áreas'],
  ['20 - Projects', '20 - Projetos'],
  ['10 - Fleeting & Daily', '10 - Diário'],
  ['00 - Inbox', '00 - Entrada'],
  ['90 - Templates', '90 - Modelos'],
];

const ignoreDirs = new Set(['.git', 'node_modules', '.obsidian', 'docs']);
const targetDirs = [
  '00 - Entrada', '10 - Diário', '20 - Projetos', '30 - Áreas',
  '40 - Recursos', '50 - Arquivo', '90 - Modelos', '99 - Meta e Anexos',
  '.'
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative('.', full);
    const top = rel.split(path.sep)[0];
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name) && !ignoreDirs.has(top)) walk(full, files);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.base')) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk('.')) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;
  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }
  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('updated:', file);
    changed++;
  }
}
console.log('Total files updated:', changed);
"
```

Expected: saída listando ~32 arquivos atualizados.

- [ ] **Step 2: Verificar que nenhuma referência antiga sobrou**

```bash
grep -r "99 - Meta & Attachments\|40 - Resources\|10 - Fleeting\|00 - Inbox\|20 - Projects\|30 - Areas\|50 - Archives\|90 - Templates" --include="*.md" --include="*.base" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="docs" .
```

Expected: nenhuma saída (zero ocorrências).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: update all vault .md references to PT-BR folder names"
```

---

### Task 10: Atualizar referências nos docs/ do template

**Files:**
- Modify: arquivos em `docs/` com referências às pastas antigas

- [ ] **Step 1: Rodar substituição em lote nos docs/**

```bash
node -e "
const fs = require('fs');
const path = require('path');

const replacements = [
  ['99 - Meta & Attachments', '99 - Meta e Anexos'],
  ['50 - Archives', '50 - Arquivo'],
  ['40 - Resources', '40 - Recursos'],
  ['30 - Areas', '30 - Áreas'],
  ['20 - Projects', '20 - Projetos'],
  ['10 - Fleeting & Daily', '10 - Diário'],
  ['00 - Inbox', '00 - Entrada'],
  ['90 - Templates', '90 - Modelos'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of walk('docs')) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;
  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }
  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('updated:', file);
    changed++;
  }
}
console.log('Total docs updated:', changed);
"
```

- [ ] **Step 2: Verificar que nenhuma referência antiga sobrou em docs/**

```bash
grep -r "99 - Meta & Attachments\|40 - Resources\|10 - Fleeting\|00 - Inbox\|20 - Projects\|30 - Areas\|50 - Archives\|90 - Templates" --include="*.md" docs/
```

Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: update folder references to PT-BR names"
```

---

### Task 11: Criar changeset major

**Files:**
- Create: `.changeset/<slug>.md`

- [ ] **Step 1: Criar o changeset interativamente**

```bash
pnpm changeset
```

Selecionar:
- Pacote: `digital-gardening-kit`
- Bump type: `major`
- Summary: escrever o texto abaixo

```
Breaking change: pastas PARA renomeadas para português.

| Antes | Depois |
|---|---|
| 00 - Inbox | 00 - Entrada |
| 10 - Fleeting & Daily | 10 - Diário |
| 20 - Projects | 20 - Projetos |
| 30 - Areas | 30 - Áreas |
| 40 - Resources | 40 - Recursos |
| 50 - Archives | 50 - Arquivo |
| 90 - Templates | 90 - Modelos |
| 99 - Meta & Attachments | 99 - Meta e Anexos |

Migração manual para vaults existentes: renomeie as pastas no explorador de arquivos e execute find & replace nos arquivos .md para atualizar wikilinks com os novos nomes.
```

- [ ] **Step 2: Verificar que o changeset foi criado**

```bash
pnpm changeset status
```

Expected: `digital-gardening-kit` com bump `major`.

- [ ] **Step 3: Commit**

```bash
git add .changeset/
git commit -m "chore: add major changeset for PT-BR folder rename"
```

---

### Task 12: Validação completa — gate final

**Files:** nenhum (só verificações)

- [ ] **Step 1: Validação completa do vault**

```bash
pnpm run validate
```

Expected: PASS em todos os steps: `lint:main`, `lint:docs`, `lint:templates`, `test`, `validate:onboarding`, `smoke:template`.

- [ ] **Step 2: Verificar estado do changeset**

```bash
pnpm changeset status
```

Expected: `digital-gardening-kit` com bump `major` presente.

- [ ] **Step 3: Verificar CLI não foi afetada**

```bash
pnpm --filter @dgk/cli test
```

Expected: PASS.

- [ ] **Step 4: Verificar que nenhuma referência antiga sobrou em qualquer lugar**

```bash
grep -r "99 - Meta & Attachments\|40 - Resources\|10 - Fleeting\|00 - Inbox\|20 - Projects\|30 - Areas\|50 - Archives\|90 - Templates" \
  --include="*.md" --include="*.json" --include="*.js" --include="*.yml" \
  --exclude-dir=".git" --exclude-dir="node_modules" \
  --exclude="CHANGELOG.md" \
  .
```

Expected: nenhuma saída.

- [ ] **Step 5: Se tudo passou — não há commit extra. O PR está pronto.**

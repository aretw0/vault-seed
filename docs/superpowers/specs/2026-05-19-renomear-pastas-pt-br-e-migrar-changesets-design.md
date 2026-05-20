# Renomear Pastas PARA para Português e Migrar para Changesets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear as 8 pastas PARA do vault de inglês para português, e migrar o lado de desenvolvimento do template de `standard-version` para changesets.

**Architecture:** Um PR atômico cobre três entregas interdependentes: (1) rename das pastas e atualização de todas as referências, (2) migração de `standard-version` → changesets no monorepo do template, (3) changeset `major` documentando a breaking change. O lado do usuário (`package.template.json`) mantém `standard-version` — o vault do usuário é um pacote único, não um monorepo.

**Tech Stack:** pnpm, @changesets/cli, markdownlint-cli, Node.js test runner

---

## Contexto: dois lados do template

Toda mudança neste projeto precisa considerar dois contextos:

| Contexto | Arquivos | Quem usa |
|---|---|---|
| **Template dev** | `package.json`, `pnpm-workspace.yaml`, `.changeset/`, `docs/`, `packages/` | Contribuidores do vault-seed |
| **Usuário** | `package.template.json` → `package.json`, `scripts/`, `.obsidian/`, pastas PARA, `AGENTS.template.md` → `AGENTS.md` | Quem inicializa o template |

O `initialize.yml` remove `docs/`, `packages/`, `.changeset/`, `pnpm-workspace.yaml` e vários workflows antes de entregar o vault ao usuário. O usuário **não recebe** changesets nem a estrutura de monorepo.

---

## Mapa de rename das pastas

| Antes | Depois |
|---|---|
| `00 - Entrada` | `00 - Entrada` |
| `10 - Diário` | `10 - Diário` |
| `20 - Projetos` | `20 - Projetos` |
| `30 - Áreas` | `30 - Áreas` |
| `40 - Recursos` | `40 - Recursos` |
| `50 - Arquivo` | `50 - Arquivo` |
| `90 - Modelos` | `90 - Modelos` |
| `99 - Meta e Anexos` | `99 - Meta e Anexos` |

---

## Escopo completo de arquivos afetados

### Pastas (rename físico)
As 8 pastas raiz — rename com `git mv` para preservar histórico.

### Template dev — lado do contribuidor

| Arquivo | O que muda |
|---|---|
| `package.json` | Globs `lint:main`, `lint:templates`; remove scripts `release*`; remove dep `standard-version`; adiciona `changeset`, `changeset:version`, `changeset:publish` como scripts principais |
| `pnpm-workspace.yaml` | Adiciona `.` aos pacotes para que changesets gerencie o root |
| `.changeset/config.json` | Sem mudança de conteúdo, mas agora cobre root + `packages/*` |
| `prepare-release-pr.yml` | Troca `pnpm run release` por `pnpm changeset version`; lê versão de `package.json` em vez do arquivo `VERSION` |
| `VERSION` | Removido — fonte de verdade passa a ser `version` em `package.json` |
| `scripts/validate_onboarding.js` | Paths hardcoded atualizados |
| `scripts/validate_onboarding.test.js` | Assertions com novos nomes |
| `.obsidian/daily-notes.json` | `folder`: `10 - Diário` → `10 - Diário` |
| `.obsidian/plugins/templater-obsidian/data.json` | `templates_folder`: `90 - Modelos` → `90 - Modelos` |
| `.obsidian/workspace.json` | Referências a pastas antigas |
| ~32 arquivos `.md` | Wikilinks, exemplos de código, paths explícitos — todos os nomes em inglês |
| `docs/` (guias, specs, planos) | Referências às pastas antigas |
| `AGENTS.template.md` | Referências às pastas PARA |

### Usuário — o que `initialize.yml` entrega

| Arquivo | O que muda |
|---|---|
| `package.template.json` | Globs `lint:main`, `lint:templates` — **mantém `standard-version`** |
| `pnpm-lock.template.yaml` | Regenerado rodando `pnpm install` na raiz após atualizar `package.template.json` — o lockfile template é o snapshot das deps do usuário |

### Não muda
- `initialize.yml` — só renomeia arquivos `.template.*`, não pastas
- Scripts `release*` em `package.template.json` — ficam como estão para o usuário
- Estrutura interna de cada pasta
- Nomes dos arquivos `.md`

---

## Migração standard-version → changesets (template dev)

### Estado atual
- Root (`digital-gardening-kit`, `private: true`): versionado por `standard-version`
- `@dgk/cli`: versionado por changesets
- `pnpm-workspace.yaml` lista apenas `packages/*` — root não é gerenciado por changesets

### Estado alvo
- Root: gerenciado por changesets (sem publicação — `private: true`)
- `@dgk/cli`: sem mudança
- `pnpm-workspace.yaml` inclui `.` — changesets descobre ambos

### Mudanças em `package.json` (root)

**Remover:**
```json
"release:dry": "standard-version --dry-run --skip.tag --infile CHANGELOG.md",
"release": "standard-version --skip.tag --infile CHANGELOG.md",
"release:minor": "standard-version --skip.tag --release-as minor --infile CHANGELOG.md",
"release:major": "standard-version --skip.tag --release-as major --infile CHANGELOG.md"
```
```json
"standard-version": "^9.5.0"
```

**Manter (já existem):**
```json
"changeset": "changeset",
"changeset:version": "changeset version",
"changeset:publish": "changeset publish"
```

### `pnpm-workspace.yaml` atualizado
```yaml
packages:
  - "."
  - "packages/*"
```

### `prepare-release-pr.yml` — passo de release

**Antes:**
```yaml
- name: Run standard-version
  id: standard_version
  run: |
    set -euo pipefail
    pnpm run release
    echo "version=$(cat VERSION)" >> "$GITHUB_OUTPUT"
    branch_name="chore/prepare-release-$(date +%s)"
    echo "branch_name=$branch_name" >> "$GITHUB_OUTPUT"
```

**Depois:**
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

Todas as referências a `steps.standard_version.outputs.*` no workflow passam a `steps.changeset_version.outputs.*`.

O arquivo `VERSION` é removido do repositório.

---

## Breaking change — changeset

Criar `.changeset/<slug>.md` com bump `major` para `digital-gardening-kit`:

```markdown
---
"digital-gardening-kit": major
---

Breaking change: pastas PARA renomeadas para português.

| Antes | Depois |
|---|---|
| 00 - Entrada | 00 - Entrada |
| 10 - Diário | 10 - Diário |
| 20 - Projetos | 20 - Projetos |
| 30 - Áreas | 30 - Áreas |
| 40 - Recursos | 40 - Recursos |
| 50 - Arquivo | 50 - Arquivo |
| 90 - Modelos | 90 - Modelos |
| 99 - Meta e Anexos | 99 - Meta e Anexos |

**Migração manual para vaults existentes:** renomeie as pastas no explorador de arquivos e execute find & replace em todos os arquivos `.md` para atualizar wikilinks com os novos nomes.
```

---

## Estratégia de migração para usuários existentes

Esta é uma **breaking change** para quem já inicializou o template. O vault do usuário é pessoal — não há mecanismo de "upgrade". A breaking change é documentada no CHANGELOG gerado automaticamente pelo changeset acima.

Não há script de migração automática — o vault é propriedade do usuário.

---

## Plano de validação

Todos os checks devem passar antes do merge:

| Check | Comando | O que valida |
|---|---|---|
| Lint vault | `pnpm run lint:main` | Globs apontam para novos nomes |
| Lint templates | `pnpm run lint:templates` | Glob `90 - Modelos/**` |
| Testes de script | `pnpm run test` | Assertions com novos nomes |
| Onboarding | `pnpm run validate:onboarding` | Paths novos em `validate_onboarding.js` |
| Smoke template | `pnpm run smoke:template` | Estrutura de pastas nova |
| Changeset | `pnpm changeset status` | Changeset major presente |
| CLI | `pnpm --filter @dgk/cli test` | CLI não afetada pelo rename |

---

## Ordem de implementação recomendada

1. Migrar `pnpm-workspace.yaml` e `package.json` (root) para changesets; remover `VERSION`; atualizar `prepare-release-pr.yml`
2. Renomear as 8 pastas com `git mv`
3. Atualizar `package.template.json` — globs lint
4. Atualizar `.obsidian/` — configs de pasta
5. Atualizar `scripts/validate_onboarding.js` e `.test.js`
6. Atualizar `AGENTS.template.md`
7. Atualizar todos os arquivos `.md` com referências às pastas (pode ser feito em lote)
8. Criar changeset `major`
9. Rodar validação completa: `pnpm run validate && pnpm changeset status`

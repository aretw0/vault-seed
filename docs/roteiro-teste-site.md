# Trilha: Site publicado e curadoria editorial

> **Quando usar:** ao verificar o estado inicial do site após inicialização,
> ao decidir o que publicar, ou ao auditar o site antes de compartilhar.
>
> **Tempo estimado:** 10–20 min.
>
> **Pré-requisito:** `pnpm install` concluído. Para as trilhas que envolvem build,
> é necessário ter o site configurado (`pnpm run site:build` exige que os assets
> e notebooks estejam prontos).

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| Notas da categoria `published` têm `status: published` no source | `smoke_template.js` (NOTE_STATUS_CONTRACT) |
| Notas `publishedResetOnInit` têm `status: published` no source | `smoke_template.js` |
| Notas `publishedResetOnInit` aparecem no step de reset do `initialize.yml` | `smoke_template.js` |
| Notas `draft` têm `status: draft` no source | `smoke_template.js` |
| Páginas com Mermaid existem no `dist/` e têm blocos renderizáveis | `mermaid_render_contract.test.js` (requer `site:build`) |
| Sidebar usa intents da arquitetura de informação sem vazar docs técnicas | `smoke_template.js` |
| `/explorar/` expõe grafo, métricas, filtros e candidatos a promoção | `smoke_template.js` |

---

## Trilha A — Estado inicial do vault do usuário

Após inicialização a partir do template, apenas uma nota chega com
`status: published` no vault do usuário: `00 - Entrada/Bem-vindo ao seu vault.md`.
Todas as notas de onboarding, workflows e referência (`99 - Meta e Anexos/`)
chegam como `draft` — disponíveis no Obsidian, não publicadas no site.

### A1. Verificar quais notas estão publicadas

```bash
grep -rn "^status: published" . --include="*.md" \
  --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir=".claude"
```

**Resultado esperado em um vault recém-inicializado:**

```
00 - Entrada/Bem-vindo ao seu vault.md:5:status: published
```

Apenas uma nota. O site existe mas está intencionalmente enxuto.

| # | Cenário | Esperado |
|---|---|---|
| A1 | Vault recém-inicializado | Apenas `Bem-vindo ao seu vault.md` com `status: published` |
| A2 | Vault com onboarding explorado | Notas em `99 - Meta e Anexos/` permanecem `draft` até o usuário decidir |
| A3 | Vault do mantenedor (vault-seed) | Grep retorna ~35 notas publicadas — o site do template é o rich site |

### A2. Auditar a arquitetura de informação

```bash
pnpm run audit:ia
```

Mostra promoção candidatas (notas com conexões mas ainda draft), orfãos e
métricas de saúde do vault. Útil para decidir o que publicar primeiro.

### A3. Verificar o site localmente antes de publicar

```bash
pnpm run site:build
pnpm run site:preview
```

Abra `http://localhost:4321`. Com apenas o `Bem-vindo` publicado, a home
mostra o grafo com poucos nós e a sidebar quase vazia — comportamento correto.

---

## Trilha B — Publicar uma nota

O fluxo padrão de curadoria: nota nasce como `draft`, o jardineiro decide
publicá-la quando está pronta.

### B1. Promover uma nota de referência

Abra qualquer nota em `99 - Meta e Anexos/` no Obsidian ou editor, e edite
o frontmatter:

```yaml
---
status: draft   # antes
---
```

```yaml
---
status: published   # depois
---
```

Salve, faça commit e aguarde o deploy, ou reconstrua o site localmente:

```bash
pnpm run site:build && pnpm run site:preview
```

| # | O que verificar | Esperado |
|---|---|---|
| B1 | Nota com `status: draft` → `published` | Aparece no site após build |
| B2 | Sidebar atualiza | Nota aparece na seção correspondente ao `intent` |
| B3 | `/explorar/` atualiza | Nó ganha conectividade no grafo e sai da lista de candidatos |
| B4 | `pnpm run audit:ia` | Nota sai de `promotionCandidates`, entra como publicada |

### B2. Publicar o blog de exemplo

A nota `30 - Áreas/Blog/Jardim digital - por onde começar.md` chega como
`draft` e serve de referência para o formato do jardim digital. Para publicá-la:

```bash
# Editar o frontmatter no editor
# Depois de salvar:
pnpm run validate  # verifica que tudo está consistente
```

---

## Trilha C — Site privado (publicação desligada)

Cenário: o usuário ainda não quer publicar nada, ou quer montar o vault
antes de tornar qualquer conteúdo público.

### C1. Verificar que o site funciona sem conteúdo público além do Bem-vindo

Com o vault recém-inicializado (apenas `Bem-vindo` como published), o build
deve completar sem erros:

```bash
pnpm run site:build
```

O site compila. A home mostra o grafo de uma nota. Sem 404 para rotas inexistentes.

### C2. Remover o deploy automático temporariamente

Se o usuário não quer Pages ativo por enquanto, pode desabilitar o workflow
de deploy no GitHub:

> Settings → Actions → Workflows → (workflow de deploy) → Disable workflow

Outra opção: deixar o site ativo mas não compartilhar o URL. O GitHub Pages
gera uma URL pública, mas sem divulgação ela permanece obscura.

### C3. Reativar Pages mais tarde

Quando o usuário decidir publicar:

1. Reativar o workflow de deploy (ou fazer um push manual)
2. Ou rodar a curadoria editorial:

```bash
pnpm run audit:ia    # identifica o que está pronto para publicar
```

---

## Trilha D — Auditoria completa do site publicado

Para mantenedores do vault-seed ou usuários que já têm conteúdo publicado.

### D1. Rodar o gate completo de validação

```bash
pnpm run validate
```

Cobre: validate:onboarding, audit:ia, site:audit:sidebar, validate:pt-text,
validate:theme, validate:mermaid e smoke_template. É o check completo antes
de um merge ou release.

### D2. Verificar a sidebar

```bash
pnpm run site:audit:sidebar
```

Detecta notas publicadas sem intent definido, seções sem notas, e violações
da ordem configurada em `.site/sidebar.sections.json`.

### D3. Verificar os diagramas Mermaid no site

Requer build prévio:

```bash
pnpm run site:build
node scripts/mermaid_render_contract.test.js
```

Verifica que os diagramas das páginas publicadas são reconstruíveis a partir
do HTML — garante que o pipeline de Expressive Code não quebrou a extração.

### D4. Rodar o smoke responsivo

```bash
pnpm run site:responsive
```

Roda o build + export de notebooks + smoke visual com Playwright em três
viewports (mobile, tablet, desktop). Retorna status de cada breakpoint.

---

## Resumo: o que vai para o usuário vs o que fica no vault-seed

| Camada | vault-seed (site de template) | vault do usuário (após init) |
|---|---|---|
| `Bem-vindo ao seu vault.md` | `published` | `published` ✅ |
| `30 - Áreas/Blog/Jardim digital…` | `published` (exemplo de blog) | `draft` — usuário decide |
| `40 - Recursos/Mermaid.md` | `published` (referência técnica) | `draft` — usuário decide |
| `99 - Meta e Anexos/99.1 - Onboarding/` | `published` (docs do template) | `draft` — material de referência |
| `99 - Meta e Anexos/99.2 - Workflows/` | `published` (guias de workflow) | `draft` — usuário decide |
| `99 - Meta e Anexos/99.3 - Referência/` | `published` (docs de referência) | `draft` — usuário decide |
| `99 - Meta e Anexos/Diagramas/Exemplos.md` | `published` (demo Mermaid) | `draft` — usuário decide |
| `40 - Recursos/Filosofia e Conceitos…` | `draft` | `draft` — conteúdo conceitual |

O mecanismo que garante isso é o step `🌱 Reset notas de referência` em
`.github/workflows/initialize.yml`, mantido em sincronia com
`NOTE_STATUS_CONTRACT` em `scripts/smoke_template.js`.

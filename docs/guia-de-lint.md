# Guia de Lint do Vault

## Filosofia

O lint usa **opt-in por padrão**: `"default": false` no `.markdownlint.json`. Isso significa que apenas as regras _explicitamente listadas_ são ativas. Upgrades do `markdownlint-cli` nunca introduzem novas regras automaticamente no CI do usuário.

A alternativa (opt-out com `"default": true` + lista de exceções) foi abandonada porque cada nova versão da ferramenta poderia quebrar o CI de usuários sem que eles tivessem feito nada.

---

## Regras ativas e o porquê de cada uma

Estas são as únicas regras que vão com o usuário. Todas existem porque evitam **bugs de renderização** ou **ambiguidades de parsing** — não são preferências de estilo.

| Regra | Nome | Motivo |
|-------|------|--------|
| `MD009` | no-trailing-spaces | Espaços no fim da linha criam `<br>` em HTML. Obsidian não os insere, mas copy-paste pode. |
| `MD010` | no-hard-tabs | Tabs renderizam de forma inconsistente entre ferramentas. Obsidian usa espaços em prosa. |
| `MD011` | no-reversed-links | `](url)[texto]` em vez de `[texto](url)` — typo que renderiza como texto literal. |
| `MD018` | no-missing-space-atx | `#título` sem espaço não renderiza como heading em muitos parsers. |
| `MD019` | no-multiple-space-atx | `##  título` com múltiplos espaços é inconsistente mas ainda parseia; evita surpresas. |
| `MD023` | headings-start-left | Um heading indentado (`  ## h`) não renderiza como heading. |
| `MD042` | no-empty-links | `[texto]()` ou `[texto][]` sem destino é sempre um bug. |
| `MD046` | code-block-style: fenced | Obsidian só cria blocos cercados; indentado seria texto editado à mão de forma incomum. |
| `MD048` | code-fence-style: backtick | Obsidian usa crases; tilde seria edição manual incomum. Consistência com o editor. |

### O que foi deliberadamente _não_ ativado

- **MD049/MD050** (emphasis/strong style): `_itálico_` e `*itálico*` são equivalentes. Forçar asteriscos quebraria notas que mostram ambas as sintaxes como exemplo.
- **MD026** (trailing punctuation in headings): `### Por que usar isso?` é escrita natural.
- **MD051–MD054** (link fragments, reference links, link style): wikilinks Obsidian `[[file#heading]]` causam falsos positivos.
- **MD055–MD058** (table formatting): pedantismo sem impacto no usuário final.
- **MD013** (line length): Obsidian não tem controle de linha automático.

---

## Estrutura de configs

```
.markdownlint.json          ← usuário: notas do vault (10–50, 99)
docs/.markdownlint.json     ← devs: extends root + MD056 (coluna de tabela)
90 - Modelos/               ← extends root apenas
```

Os subconfigs herdam via `"extends"`. Para adaptar ao contexto do vault final, edite só o root — os outros pegam automaticamente.

---

## Como o CI usa

```bash
pnpm run lint:main     # 10 - Diário, 20 - Projetos, …, 99 - Meta e Anexos
pnpm run lint:docs     # docs/
pnpm run lint:templates # 90 - Modelos/
```

Todos fazem parte do `pnpm run validate` que o CI executa. Além do lint de Markdown, o `validate` inclui:

- Auditoria de arquitetura de informação: detecta **notas publicadas fora da navegação** (sem intenção derivada ou category inválida), links de onboarding quebrados e derivadas ausentes
- Auditoria da sidebar: verifica que as seções do site têm entradas corretas
- Testes de contrato: verificam estrutura HTML, CSS e comportamento de scripts

---

## Personalização pelo usuário

Para **desativar uma regra pontualmente** em um arquivo específico:

```markdown
<!-- markdownlint-disable MD009 -->
```

Para **uma linha específica**:

```markdown
<!-- markdownlint-disable-next-line MD042 -->
[rascunho]()
```

Para **remover uma regra permanentemente** do seu vault, edite `.markdownlint.json` e remova ou defina como `false`.

---

## Adicionando regras ao seu vault

A lista completa está em [markdownlint/Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md). Antes de ativar qualquer regra nova, teste contra o seu conteúdo atual:

```bash
npx markdownlint --config .markdownlint.json "**/*.md" 2>&1 | head -30
```

---
title: Qualidade e Lint de Notas
aliases:
  - Lint de Markdown
  - Markdownlint no Vault
tags:
  - meta/qualidade
  - meta/ci
status: published
created: 2026-06-09
updated: 2026-06-09
category: referencia
audience: iniciante
related:
  - "[[Convenções e Boas Práticas]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
---

# Qualidade e Lint de Notas

O vault tem um verificador automático de formatação Markdown chamado **markdownlint**. Ele roda no CI (GitHub Actions) sempre que você sincroniza mudanças com o GitHub.

---

## O que ele verifica — e por quê só isso

O config usa opt-in: só as regras _explicitamente listadas_ estão ativas. O conjunto é pequeno e focado em **erros que afetam como a nota renderiza**, não em preferências de estilo:

| O que verifica | Por que importa |
|---|---|
| Espaços no fim da linha | Criam uma quebra de linha (`<br>`) invisível no HTML |
| Tabs no texto | Renderizam diferente em cada ferramenta |
| Links invertidos `](url)[texto]` | Typo que aparece como texto literal, não como link |
| `#título` sem espaço | Não renderiza como heading em vários parsers |
| Heading indentado `  ## h` | Não renderiza como heading |
| Link vazio `[texto]()` | Sempre um bug — o link não leva a lugar nenhum |
| Blocos de código com tilde ` ``` ` vs `~~~` | Obsidian usa crases; tilde seria edição manual incomum |

O que **não** está ativo: regras de comprimento de linha, pontuação em headings, estilo de ênfase (`_itálico_` vs `*itálico*`), formatação de tabelas. Essas são preferências — o Obsidian não te ajuda a evitá-las, então forçá-las só criaria ruído no CI.

---

## O que fazer quando o CI falha com erro de lint

O Actions vai mostrar algo como:

```
minha-nota.md:15:30 error MD042/no-empty-links Empty link text
```

Isso diz: arquivo, linha, coluna, código da regra, e o problema.

**Corrigir** é o caminho preferido — em geral a correção é óbvia (adicionar destino ao link, remover o espaço sobrando).

Se a situação é legítima e a regra não faz sentido _para aquele trecho_, você pode **suprimir localmente**:

```markdown
<!-- markdownlint-disable-next-line MD042 -->
[rascunho em construção]()
```

Ou para um arquivo inteiro no topo:

```markdown
<!-- markdownlint-disable MD042 -->
```

---

## Personalizando as regras do seu vault

O arquivo `.markdownlint.json` na raiz do repositório controla tudo. Para **desativar** uma regra:

```json
{
  "default": false,
  "MD009": true,
  "MD042": false
}
```

Para **ativar** uma regra adicional que faça sentido no seu contexto, consulte a [lista completa de regras](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) e adicione com `true` ou com opções específicas.

**Antes de ativar algo novo**, teste contra seu conteúdo real:

```bash
pnpm exec markdownlint --config .markdownlint.json "99 - Meta e Anexos/**/*.md"
```

---

## A pasta 00 - Entrada não tem lint

Propositalmente. A entrada é espaço livre — capture sem se preocupar com formatação. Ao mover uma nota para `20 - Projetos`, `40 - Recursos` ou qualquer outra pasta permanente, o lint passa a valer.

---

Voltar para [[Convenções e Boas Práticas]]

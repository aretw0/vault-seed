---
title: Bases
aliases:
  - Obsidian Bases
tags:
  - obsidian/bases
  - tipo/conceito
  - recurso/ferramenta
status: published
created: 2026-05-19
updated: 2026-05-19
category: conceito
audience: intermediario
related:
  - "[[Obsidian]]"
  - "[[Dataview]]"
  - "[[MOC Vault Seed]]"
---

# Bases

Bases e um plugin core do Obsidian para criar visualizacoes parecidas com bancos de dados a partir das propriedades das notas. Uma Base pode morar em um arquivo `.base` ou dentro de um bloco de codigo `base` em uma nota Markdown.

Use Bases quando quiser filtrar, ordenar e agrupar notas com uma interface visual. Como os dados continuam em Markdown e frontmatter, o vault segue legivel fora do Obsidian.

## Quando Usar

- Projetos ativos por status.
- Listas de leitura.
- Inventario de notas por categoria ou publico.
- MOCs dinamicos que mostram notas recentes ou publicadas.

## Exemplo

```yaml
filters:
  and:
    - file.ext == "md"
    - status == "published"
views:
  - type: table
    name: Publicadas
    order:
      - file.name
      - category
      - audience
```

No vault-seed, veja [[Vault Seed Kitchen Sink.base]] e [[MOC Vault Seed]].

## Referências

- [Introdução a Bases](https://help.obsidian.md/bases)
- [Sintaxe de Bases](https://help.obsidian.md/bases/syntax)

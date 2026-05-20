---
title: MOC Vault Seed
aliases:
  - Kitchen Sink do Vault Seed
  - Mapa do Vault Seed
tags:
  - meta/moc
  - meta/onboarding
  - obsidian/bases
  - obsidian/dataview
  - obsidian/moc
status: published
created: 2026-05-19
updated: 2026-05-19
category: moc
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Exploracao Guiada do Vault]]"
  - "[[Depois da Recepcao do Template]]"
  - "[[Evoluindo seu Vault com Links, Tags e MOCs]]"
---

# MOC Vault Seed

Este mapa mostra o proprio vault-seed como exemplo de organizacao. Use-o para entender quais notas explicam o template, quais conceitos orbitam o vault e como Bases ou Dataview podem transformar propriedades em navegacao.

## Comece Por Aqui

- [[Guia do Jardineiro Digital]]
- [[Exploracao Guiada do Vault]]
- [[Preparando seu Computador para o Vault]]
- [[Depois da Recepcao do Template]]
- [[Configurando o Obsidian Git]]

## Conceitos Que Sustentam o Vault

- [[Filosofia e Conceitos Fundamentais]]
- [[O que é o método PARA]]
- [[O que é o método Zettelkasten]]
- [[O que são MOCs (Mapas de Conteúdo)]]
- [[Links]]
- [[Tags]]
- [[Daily Note]]

## Operacao e Ferramentas

- [[Obsidian]]
- [[VS Code]]
- [[Templater]]
- [[Plugins Essenciais e Recomendados]]
- [[Usando o Git e o GitHub para Sincronizar seu Vault]]
- [[Usando o Vault no Celular vs. Desktop]]

## Base Nativa

Abra [[Vault Seed Kitchen Sink.base]] para ver uma Base nativa com guias e conceitos do template. Ela usa propriedades do frontmatter como `status`, `category` e `audience`, alem de propriedades de arquivo como `file.mtime`.

Voce tambem pode embutir uma Base em uma nota:

```base
filters:
  and:
    - file.ext == "md"
    - file.hasTag("meta/onboarding") || file.hasTag("meta/workflow") || file.hasTag("obsidian/moc")
views:
  - type: table
    name: Onboarding e workflow
    order:
      - file.name
      - status
      - category
      - audience
```

## Dataview

Se o plugin Dataview estiver instalado, este bloco lista guias e recursos publicados:

```dataview
TABLE status, category, audience, file.mtime AS "Atualizado"
FROM "99 - Meta & Attachments" or "40 - Resources"
WHERE status = "published"
SORT file.name ASC
```

Use Bases quando quiser uma interface visual e nativa. Use Dataview quando precisar de consultas mais expressivas, especialmente em dashboards ou revisoes periodicas.

---

Voltar para [[Guia do Jardineiro Digital]]

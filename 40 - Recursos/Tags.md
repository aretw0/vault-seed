---
title: Tags
tags:
  - pkm/conceito
  - obsidian/tag
  - recurso/ferramenta
status: draft
created: 2026-05-18
updated: 2026-05-26
category: conceito
audience: iniciante
related:
  - "[[Convenções e Boas Práticas]]"
  - "[[Evoluindo seu Vault com Links, Tags e MOCs]]"
  - "[[Links]]"
---
# Tags

Tags ajudam a classificar notas por contexto, status ou tipo. Elas são úteis para filtros, buscas, Bases, Dataview e validações, mas não substituem links entre ideias.

Use tags para responder perguntas como: “qual é o estado desta nota?”, “que tipo de conteúdo é este?” ou “qual ferramenta aparece aqui?”. Use [[Links]] para responder: “com quais ideias esta nota conversa?”.

## Boas práticas

Prefira poucas tags claras, como:

- `status/rascunho`
- `status/published`
- `pkm/conceito`
- `meta/guia`
- `obsidian/plugin`

Evite criar uma tag nova para cada detalhe. Muitas tags parecidas tornam filtros menos confiáveis e dificultam manutenção.

## Tags neste vault

O template usa tags também como contrato editorial. Algumas tags ajudam a derivar intenções de navegação, como organizar, publicar, automatizar ou manter. Por isso, ao mudar tags de uma nota publicada, rode `pnpm run validate` para confirmar que sidebar, site e auditorias continuam coerentes.

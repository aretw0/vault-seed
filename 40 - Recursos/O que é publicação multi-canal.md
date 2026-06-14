---
title: O que é publicação multi-canal
tags:
  - pkm/publicacao
  - recurso/ferramenta
  - meta/documentacao
status: draft
category: conceito
audience: todos
---

# O que é publicação multi-canal

Uma nota do vault pode ser publicada em múltiplos lugares a partir de uma única fonte. O frontmatter controla os destinos — o conteúdo permanece em um só lugar.

## Como funciona

O notebook `analise-outbox` lê o frontmatter de todas as notas do vault e identifica quais estão prontas para cada canal. Um item com `channels: [site, newsletter]` aparece em dois destinos distintos sem duplicar o texto.

## Canais disponíveis

| Canal | Automação | Revisão |
|-------|-----------|---------|
| Site | Build estático | Não |
| RSS | Gerado pelo site | Não |
| Newsletter | Rascunho assistido | Sim |
| Mastodon | Dry-run primeiro | Sim |
| Bluesky | Dry-run primeiro | Sim |
| LinkedIn | Manual | Sim |

## Por onde começar

Adicione `outbox: true` a qualquer nota que você queira rastrear no outbox. O status `draft` → `ready` → `published` guia o ciclo de revisão.

---

*Esta nota é um exemplo do vault-seed. Substitua pelo seu conteúdo.*

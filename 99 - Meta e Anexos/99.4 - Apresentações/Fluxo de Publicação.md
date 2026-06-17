---
title: Fluxo de Publicação
aliases:
  - Apresentação Publicação
  - Publicação do Vault
tags:
  - meta/apresentacao
  - meta/publicacao
  - meta/site
status: published
created: 2026-06-14
updated: 2026-06-14
category: referencia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[Outbox Soberana de Publicação]]"
  - "[[Publicando e Consumindo RSS no Vault]]"
  - "[[Visão Geral do Vault Seed]]"
  - "[[O Lab — Notebooks e Dados]]"
  - "[[Integração com Agentes de IA]]"
---

# Fluxo de Publicação

O vault-seed publica notas Markdown como site estático via Astro e Starlight, sem depender de plataformas proprietárias. O histórico fica no Git; o deploy roda no CI; o site é servido por qualquer host estático.

## O que é publicado

O site agrupa as notas por status e categoria. Apenas notas com `status: published` e uma `category` declarada entram na navegação pública. As demais ficam no vault local.

A outbox multi-canal complementa o site: rascunhos curados ficam em `00 - Entrada/Outbox/` e são enviados para canais externos (Telegram, RSS, newsletter) depois de revisão manual ou por agente.

## CI como infraestrutura

O workflow `deploy-site.yml` roda em cada push para `main`:

1. Gera `vault-data.json` a partir das notas.
2. Exporta os notebooks Marimo listados em `.site/lab.notebooks.json`.
3. Constrói o site Astro com os notebooks copiados em `public/lab/`.
4. Faz deploy para GitHub Pages.

O mesmo repositório que contém as notas contém o pipeline. Não há serviço externo de build separado.

## RSS e feeds

Notas com `status: published` entram automaticamente no feed RSS do site — o campo `audience` é metadado editorial para leitores, não um filtro de acesso. O feed fica em `/rss.xml`. Leitores de feed externos podem assinar direto da URL do site.

O vault também pode assinar feeds externos. O comando `dgk etl` inclui o processamento de fontes declaradas em `dados/feeds-assinados.json` como parte do pipeline, alimentando o dataset de curadoria consumido pelos notebooks do Lab.

## A apresentação interativa

A apresentação em slides está disponível no Lab publicado, gerada a partir do notebook `99 - Meta e Anexos/Notebooks/apresentacoes/publicacao.py`. Ela cobre o pipeline de build, a outbox, o RSS e o papel do CI como infraestrutura.

## Para saber mais

- [[Publicando seu Vault como Site]] — guia passo a passo do deploy com Astro e GitHub Pages
- [[Outbox Soberana de Publicação]] — curadoria, revisão e envio para canais externos
- [[Publicando e Consumindo RSS no Vault]] — RSS como interface de publicação e assinatura

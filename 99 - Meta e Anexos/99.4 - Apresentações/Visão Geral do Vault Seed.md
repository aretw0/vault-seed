---
title: Visão Geral do Vault Seed
aliases:
  - Apresentação Vault Seed
  - O que é o vault-seed
tags:
  - meta/apresentacao
  - meta/vault-seed
  - meta/onboarding
status: draft
created: 2026-06-14
updated: 2026-06-14
category: referencia
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Entendendo a Estrutura de Pastas]]"
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Publicando seu Vault como Site]]"
  - "[[O Lab — Notebooks e Dados]]"
  - "[[Fluxo de Publicação]]"
  - "[[Integração com Agentes de IA]]"
---

# Visão Geral do Vault Seed

O vault-seed é um template de repositório Git que transforma um conjunto de notas Markdown em um sistema modular de gestão do conhecimento: vault local editável, site publicado, notebooks interativos e automação de publicação multi-canal — tudo no mesmo repositório, sem dependência de plataformas proprietárias.

## O que é

Um repositório que é ao mesmo tempo:

- **Vault de notas** — Markdown editável no Obsidian, VS Code ou qualquer editor
- **Site publicado** — gerado diretamente das notas com Astro e Starlight
- **Lab de análise** — notebooks Marimo versionados, rodando localmente ou como HTML WebAssembly
- **Plataforma de publicação** — outbox multi-canal com curadoria antes do envio

## A filosofia

O trabalho diário acontece no computador. O site e os canais são artefatos derivados dessa base local — nunca o contrário. Os dados são seus antes de qualquer sincronização com a nuvem.

O formato é aberto (Markdown), o histórico é auditável (Git), o deploy é portátil (qualquer host estático), e os agentes de IA operam via arquivos e diff — sem APIs proprietárias.

## A apresentação interativa

A apresentação navegável em slides está disponível no Lab publicado. Ela é gerada a partir do notebook `99 - Meta e Anexos/Notebooks/apresentacoes/visao-geral.py` e inclui dados dinâmicos do vault (contagem de notas, pastas, tags).

## Apresentações relacionadas

- [[O Lab — Notebooks e Dados]] — como os notebooks funcionam, o pipeline de dados e os modos de execução
- [[Fluxo de Publicação]] — site, outbox, canais, RSS e CI como infraestrutura
- [[Integração com Agentes de IA]] — Pi, Claude Code, inbox soberana e curadoria com IA

---
title: Apresentações
aliases:
  - Índice de Apresentações
  - MOC Apresentações
tags:
  - meta/apresentacao
  - meta/moc
status: published
created: 2026-06-14
updated: 2026-06-14
category: moc
audience: todos
related:
  - "[[Visão Geral do Vault Seed]]"
  - "[[O Lab — Notebooks e Dados]]"
  - "[[Fluxo de Publicação]]"
  - "[[Integração com Agentes de IA]]"
---

# Apresentações

Quatro apresentações cobre os aspectos principais do vault-seed. Cada uma tem uma nota de referência no vault e um notebook Marimo que gera os slides interativos publicados no Lab.

## As Apresentações

### [[Visão Geral do Vault Seed]]

O que é o vault-seed, como as partes se conectam e a filosofia local-first. Ponto de entrada para quem está conhecendo o sistema pela primeira vez.

Notebook: `99 - Meta e Anexos/Notebooks/apresentacoes/visao-geral.py`

---

### [[O Lab — Notebooks e Dados]]

Notebooks Marimo, o pipeline de dados (notas → `vault-data.json` → notebooks), os três modos de execução e o contrato do runtime.

Notebook: `99 - Meta e Anexos/Notebooks/apresentacoes/o-lab.py`

---

### [[Fluxo de Publicação]]

Como notas viram site estático, a outbox multi-canal, RSS e o papel do CI como infraestrutura de publicação.

Notebook: `99 - Meta e Anexos/Notebooks/apresentacoes/publicacao.py`

---

### [[Integração com Agentes de IA]]

Pi, Claude Code e Codex no fluxo local; inbox soberana; curadoria assistida; o papel do `AGENTS.md` como contrato de contexto.

Notebook: `99 - Meta e Anexos/Notebooks/apresentacoes/agentes.py`

---

## No Lab publicado

As apresentações ficam disponíveis em `/lab/` na seção "Apresentações" da página do Lab. São exportadas como HTML WebAssembly — rodam no navegador, sem servidor.

Para gerar os slides localmente:

```bash
pnpm run notebooks:export:slides
```

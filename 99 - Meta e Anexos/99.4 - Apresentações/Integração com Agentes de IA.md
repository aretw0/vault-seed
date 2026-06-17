---
title: Integração com Agentes de IA
aliases:
  - Apresentação Agentes
  - Agentes no Vault
tags:
  - meta/apresentacao
  - meta/agentes
  - meta/ia
status: published
created: 2026-06-14
updated: 2026-06-14
category: referencia
audience: todos
related:
  - "[[Usando com Agentes de IA]]"
  - "[[Inbox Soberana de Fontes]]"
  - "[[Rotina de Curadoria Editorial.md]]"
  - "[[Visão Geral do Vault Seed]]"
  - "[[O Lab — Notebooks e Dados]]"
  - "[[Fluxo de Publicação]]"
---

# Integração com Agentes de IA

O vault-seed foi projetado para coexistir com agentes de IA sem depender deles. A interface é o sistema de arquivos: notas Markdown, arquivos Python, scripts Node e commits Git — tudo legível e editável por qualquer agente que opere no terminal.

## A filosofia

Agentes operam via diff, não via API. O agente lê arquivos, propõe mudanças, o humano revisa e commita. O histórico Git é a memória auditável. Não há lock-in de plataforma de IA.

O vault não armazena chaves de API nem tokens de serviços externos no repositório. Credenciais ficam em silos locais fora do controle de versão.

## Agentes em uso no ecossistema

- **Pi** — coding harness de terminal da Earendil Inc. (pi.dev); suporta múltiplos provedores de IA incluindo Claude; extensível via skills TypeScript. Veja [[Agentes de Codificação]].
- **Claude Code** — opera no terminal do vault: edita notebooks, refatora scripts, roda testes, commita.
- **Codex / OpenCode** — alternativa ao Claude Code para tarefas de edição de código.

Qualquer agente compatível com terminal pode ser usado. O `AGENTS.md` do repositório descreve o contexto e as convenções para que o agente entenda o projeto sem explicação manual.

## Inbox soberana

A pasta `00 - Entrada/` funciona como inbox de captura. Conteúdo de webhooks, feeds, Telegram ou qualquer fonte externa chega como arquivos Markdown com frontmatter. O agente pode ler, classificar e mover essas notas para as pastas certas do PARA.

Esse fluxo mantém o dado no repositório antes de qualquer sincronização com nuvem. A inbox é soberana: o usuário decide o que fica e o que vai para outros canais.

## Curadoria com IA

O notebook `99 - Meta e Anexos/Notebooks/curadoria-feeds-ia.py` usa um modelo de linguagem para classificar entradas de feeds RSS/Atom e gerar sugestões editoriais. O resultado alimenta o dataset `curadoria-ia` consumido pelo notebook ETL.

Essa etapa é opcional e configurável: sem chave de API, o script pula a classificação por IA e faz curadoria só por metadados.

## A apresentação interativa

A apresentação em slides está disponível no Lab publicado, gerada a partir do notebook `99 - Meta e Anexos/Notebooks/apresentacoes/agentes.py`. Ela detalha os padrões de integração, a inbox soberana e como os agentes se encaixam no fluxo local-first.

## Para saber mais

- [[Usando com Agentes de IA]] — guia prático de uso do Claude Code, Pi e Codex no vault
- [[Inbox Soberana de Fontes]] — captura de conteúdo externo sem dependência de plataforma
- [[Rotina de Curadoria Editorial.md]] — fluxo de revisão antes de publicar para canais externos

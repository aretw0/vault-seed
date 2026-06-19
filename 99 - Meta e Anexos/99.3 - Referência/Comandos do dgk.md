---
title: Comandos do dgk
aliases:
  - Referência de Comandos
  - dgk CLI
tags:
  - meta/cli
  - meta/referencia
  - meta/setup
status: published
created: 2026-06-17
updated: 2026-06-17
category: referência
audience: todos
related:
  - "[[Configurando Localmente]]"
  - "[[Trilha do Lab Interativo]]"
  - "[[Trilha de Publicação em Canal]]"
sidebar:
  order: 91
---

# Comandos do dgk

Referência canônica de todos os comandos da CLI `dgk`. As trilhas e guias do
vault mostram subconjuntos curados para cada workflow — esta nota é a fonte
única; quando um comando muda, ela é o primeiro lugar a atualizar.

Estes blocos são sincronizados pelo `mdt_cli` a partir de
`.templates/commands.t.md` — rode `mdt update` na raiz do projeto depois de
editar o template para propagar a mudança aqui.

## Comandos principais

<!-- {=dgk-commands-table} -->
| Comando | Descrição |
|---|---|
| `dgk setup` | Configura o ambiente local (git, deps, Python tools) |
| `dgk doctor` | Diagnostica o ambiente (node, pnpm, uv, python, binários) |
| `dgk check` | Verifica a saúde do vault (onboarding, IA, texto e apresentações) |
| `dgk evaluate [nota]` | Avalia qualidade de escrita; use `--presentations` para slides Marimo |
| `dgk lint` | Valida o markdown do vault |
| `dgk sow <canal>` | Configura credenciais de publicação (`~/.dgk/silo.json`) |
| `dgk etl` | Executa o pipeline de dados do vault |
| `dgk outbox <canal>` | Publica notas da fila para o canal (ex: `telegram`) |
| `dgk inbox <canal>` | Importa mensagens do canal para o vault (ex: `telegram`) |
| `dgk serve [--port N]` | Inicia o painel admin local (padrão: porta 4322) |
| `dgk obsidian [nome]` | Abre o vault no Obsidian |
| `dgk vscode` | Abre o vault no VS Code (Foam pré-configurado) |
| `dgk note <cmd>` | Executa um comando no Obsidian CLI |
| `dgk lab <sub>` | Laboratório: notebooks, curate, export |
| `dgk publish <sub>` | Scaffolda skills e extensões Pi no npm |
| `dgk validate` | Pipeline de CI completo (dev) |
<!-- {/dgk-commands-table} -->

## Subcomandos do Lab

<!-- {=dgk-lab-subcommands} -->
| Subcomando | Descrição |
|---|---|
| `dgk lab <notebook>` | Abre notebook no Marimo (ex: `analise-feeds`) |
| `dgk lab curate` | Classifica feeds com IA (requer chave de LLM via `dgk sow`) |
| `dgk lab export` | Exporta notebooks para HTML empacotado |
<!-- {/dgk-lab-subcommands} -->

## Fluxo típico

<!-- {=dgk-typical-flow} -->
```bash
dgk sow telegram          # configura credenciais (uma vez)
dgk etl                   # processa dados do vault
dgk outbox telegram --dry-run  # revisa o que será publicado
dgk outbox telegram       # publica
```
<!-- {/dgk-typical-flow} -->

## Onde cada comando é usado em detalhe

- `dgk setup`, `dgk doctor`, `dgk check`, `dgk evaluate` → [[Configurando Localmente]]
- `dgk etl`, `dgk lab <notebook>`, `dgk lab export` → [[Trilha do Lab Interativo]]
- `dgk sow <canal>`, `dgk outbox <canal>` → [[Trilha de Publicação em Canal]]

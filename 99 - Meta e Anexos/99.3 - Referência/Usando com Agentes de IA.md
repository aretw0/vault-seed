---
title: Usando com Agentes de IA
aliases:
  - Agentes de IA no Vault
  - Vault como Sandbox para IA
tags:
  - meta/ia
  - meta/agentes
status: published
created: 2026-05-19
updated: 2026-05-23
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Automacoes no Obsidian]]"
  - "[[Conhecendo o Agents Lab]]"
  - "[[Inbox Soberana de Fontes]]"
  - "[[Outbox Soberana de Publicação]]"
---
# Usando com Agentes de IA

Este vault é um bom ambiente para trabalhar com agentes de IA — Claude Code,
Codex CLI, Gemini CLI, ou qualquer agente que leia e escreva arquivos Markdown.

## O vault é a memória do agente

Você não precisa de pastas ocultas ou arquivos de estado externos. O PARA já é
um sistema de memória: use as próprias notas para dar contexto ao agente.

**Padrão recomendado:**

- `00 - Entrada/contexto-ativo.md` — estado atual do trabalho com o agente
  (o que está sendo feito, decisões recentes, próximos passos)
- `20 - Projetos/` — projetos onde o agente pode contribuir
- `40 - Recursos/` — referências que o agente pode consultar

Ao iniciar uma nova sessão, aponte o agente para `contexto-ativo.md`.
Ao terminar, peça ao agente para atualizar esse arquivo com o que foi feito.

## Configuração para Claude Code

O vault já vem com `.claude/settings.json` que libera as operações mais
comuns sem pedir confirmação:

- Leitura de qualquer arquivo do vault
- Edição de arquivos `.md`
- Execução de `pnpm run *` e `bash scripts/*`

Operações destrutivas (deletar arquivos, git push) continuam pedindo
confirmação. Você pode ajustar as permissões em `.claude/settings.json`.

O arquivo `AGENTS.md` na raiz do repositório é o system prompt do vault —
descreve a estrutura PARA, as convenções de notas e o que o agente pode
fazer com segurança.

## Compatibilidade com outros agentes

O `AGENTS.md` funciona como contexto para qualquer agente:

- **Claude Code / Codex CLI:** lê `AGENTS.md` automaticamente
- **Gemini CLI:** crie `GEMINI.md` na raiz apontando para `AGENTS.md`
  com o conteúdo `@AGENTS.md`
- **Obsidian plugins de IA:** cole o conteúdo de `AGENTS.md` no campo
  de system prompt do plugin

Se quiser explorar um projeto do mesmo ecossistema dedicado a skills, tools e
experimentos com agentes, veja [[Conhecendo o Agents Lab]]. Ele é opcional e
não faz parte do uso básico do vault.

Para fontes externas, prefira um handoff estreito: o agente transforma um item
em nota candidata na [[Inbox Soberana de Fontes]], preservando proveniência e
mantendo `status: draft` até revisão humana.

Para distribuição externa, use a [[Outbox Soberana de Publicação]]: o agente
pode adaptar uma nota canônica para rascunhos por canal, mas não deve postar,
chamar APIs sociais ou remover a revisão humana do fluxo.

## Dicas de uso

- **Sessões curtas funcionam melhor** — dê uma tarefa clara por sessão
- **Revise antes de commitar** — use `git diff` ou GitHub Desktop para ver
  o que o agente mudou antes de fazer push
- **Use branches** — para mudanças grandes, peça ao agente para trabalhar
  em um branch separado
- **O agente não conhece o futuro** — mantenha o `contexto-ativo.md` atualizado
  para que cada sessão comece com o estado correto

---

Voltar para [[Preparando seu Computador para o Vault]]

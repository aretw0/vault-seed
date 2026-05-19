---
title: Depois da Recepcao do Template
aliases:
  - Pos-recepcao do Template
  - O que Fazer Depois da Inicializacao
tags:
  - meta/onboarding
  - meta/workflow
  - git/github
  - obsidian/git
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Exploracao Guiada do Vault]]"
  - "[[Configurando o Obsidian Git]]"
  - "[[MOC Vault Seed]]"
---

# Depois da Recepcao do Template

Quando voce cria um vault a partir do template, o workflow de inicializacao faz a recepcao: limpa historico de release do template, renomeia arquivos `.template.md` e remove automacoes que so servem para manter o projeto original.

Depois disso, o repositorio e seu. Esta nota ajuda a conferir se o ambiente ficou pronto para uso diario.

## Conferencia Inicial

1. Abra o repositorio no GitHub e espere a aba **Actions** terminar o primeiro workflow.
2. Abra o vault no Obsidian e confira se [[Guia do Jardineiro Digital]] e [[Exploracao Guiada do Vault]] existem.
3. Abra o repositorio no GitHub Desktop ou no VS Code e veja se nao ha arquivos pendentes antes de editar.
4. Configure o Obsidian Git seguindo [[Configurando o Obsidian Git]].
5. Faca uma nota pequena em `00 - Inbox/`, rode um primeiro commit e confirme se ela aparece no GitHub.

## O Que Continua Com Voce

- Notas de onboarding em `99 - Meta & Attachments/`.
- Conceitos de apoio em `40 - Resources/`.
- Templates em `90 - Templates/`.
- Configuracoes seguras do Obsidian, como plugins core e preferencias gerais.
- `AGENTS.md`, `CLAUDE.md` e `GEMINI.md`, para assistentes de IA que aceitam system prompts de projeto.

## O Que Nao Deve Ser Sincronizado Manualmente

- Pastas de plugins instalados em `.obsidian/plugins/`.
- Workspace, cache e estado local do Obsidian.
- Arquivos com tokens, chaves de API ou configuracoes pessoais.
- Mudancas feitas ao mesmo tempo em dois dispositivos sem `pull` antes.

## Rotina Segura Entre Dispositivos

1. Ao abrir o vault, puxe as alteracoes mais recentes.
2. Escreva normalmente.
3. Salve e sincronize antes de trocar de aparelho.
4. Se aparecer conflito, pare e resolva em um computador, de preferencia com GitHub Desktop ou VS Code.

No celular, o fluxo mais simples e deixar o Obsidian Git fazer pull e commit-and-sync. No desktop, GitHub Desktop costuma ser melhor para revisar conflitos e entender o que mudou.

## Onde Explorar Depois

- [[MOC Vault Seed]] para ver o template como mapa navegavel.
- [[Evoluindo seu Vault com Links, Tags e MOCs]] para aprender quando usar links, tags, MOCs, Bases e Dataview.
- [[Criando seu Painel de Controle (Dashboard)]] para montar uma pagina inicial do seu proprio vault.

---

Voltar para [[Guia do Jardineiro Digital]]

---
title: Depois da Recepção do Template
aliases:
  - Pós-recepção do Template
  - O que Fazer Depois da Inicialização
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

# Depois da Recepção do Template

Quando você cria um vault a partir do template, o workflow de inicialização faz a recepção: limpa histórico de release do template, renomeia arquivos `.template.md` e remove automações que só servem para manter o projeto original.

Depois disso, o repositório é seu. Esta nota ajuda a conferir se o ambiente ficou pronto para uso diário.

## Conferência Inicial

1. Abra o repositório no GitHub e espere a aba **Actions** terminar o primeiro workflow.
2. Abra o vault no Obsidian e confira se [[Guia do Jardineiro Digital]] e [[Exploracao Guiada do Vault]] existem.
3. Abra o repositório no GitHub Desktop ou no VS Code e veja se não há arquivos pendentes antes de editar.
4. Configure o Obsidian Git seguindo [[Configurando o Obsidian Git]].
5. Faça uma nota pequena em `00 - Entrada/`, rode um primeiro commit e confirme se ela aparece no GitHub.

## O Que Continua Com Você

- Notas de onboarding em `99 - Meta e Anexos/`.
- Conceitos de apoio em `40 - Recursos/`.
- Templates em `90 - Modelos/`.
- Configurações seguras do Obsidian, como plugins core e preferências gerais.
- `AGENTS.md`, `CLAUDE.md` e `GEMINI.md`, para assistentes de IA que aceitam system prompts de projeto.

## O Que Não Deve Ser Sincronizado Manualmente

- Pastas de plugins instalados em `.obsidian/plugins/`.
- Workspace, cache e estado local do Obsidian.
- Arquivos com tokens, chaves de API ou configurações pessoais.
- Mudanças feitas ao mesmo tempo em dois dispositivos sem `pull` antes.

## Rotina Segura Entre Dispositivos

1. Ao abrir o vault, puxe as alterações mais recentes.
2. Escreva normalmente.
3. Salve e sincronize antes de trocar de aparelho.
4. Se aparecer conflito, pare e resolva em um computador, de preferência com GitHub Desktop ou VS Code.

No celular, o fluxo mais simples é deixar o Obsidian Git fazer pull e commit-and-sync. No desktop, GitHub Desktop costuma ser melhor para revisar conflitos e entender o que mudou.

## Onde Explorar Depois

- [[MOC Vault Seed]] para ver o template como mapa navegável.
- [[Evoluindo seu Vault com Links, Tags e MOCs]] para aprender quando usar links, tags, MOCs, Bases e Dataview.
- [[Criando seu Painel de Controle (Dashboard)]] para montar uma página inicial do seu próprio vault.

---

Voltar para [[Guia do Jardineiro Digital]]

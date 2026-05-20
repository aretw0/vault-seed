---
title: O que sao system prompts de IA?
aliases:
  - System prompts
  - Instrucoes de IA
  - AGENTS.md
tags:
  - meta/documentacao
  - ia/configuracao
status: published
created: 2025-11-20
updated: 2026-05-18
category: conceito
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
---
# O que sao system prompts de IA?

Um system prompt e um documento de instrucoes para assistentes de Inteligencia
Artificial. Pense nele como o "manual de convivencia" do seu vault: ele explica
como a IA deve agir, quais convencoes deve respeitar e quais cuidados precisa
tomar ao ajudar voce a organizar, escrever ou revisar notas.

Neste vault, o arquivo canonico e `AGENTS.md`, localizado na raiz do
repositorio. Outras ferramentas podem usar arquivos de compatibilidade que
apontam para ele, como `CLAUDE.md` ou `GEMINI.md`, mas a ideia e manter um unico
conteudo principal para evitar divergencia.

## Por que ele e importante?

Sem um prompt de projeto, uma IA trabalha de forma generica. Ela nao conhece a
estrutura PARA do vault, suas convencoes de nomenclatura, o papel do Git no
processo de revisao, nem a filosofia por tras do seu jardim digital.

Um bom system prompt ajuda a IA a:

- **Respeitar suas convencoes:** usar a estrutura PARA, seguir padroes de nomes
  e preservar links internos.
- **Entender seu workflow:** saber o que e um Rascunho Seguro (Branch) e uma
  Proposta de Melhoria (Pull Request).
- **Falar a sua lingua:** usar analogias e termos que fazem sentido para voce.
- **Ser uma ferramenta segura:** lembrar que o controle final continua sendo
  humano.

## Arquivos de compatibilidade

Algumas ferramentas procuram um nome de arquivo especifico. Para evitar manter
varias copias do mesmo prompt:

- `AGENTS.md` guarda o conteudo principal.
- `GEMINI.md` e um link simbolico para `AGENTS.md`.
- `CLAUDE.md` usa o recurso de importacao do Claude Code com `@AGENTS.md`.

Segundo a documentacao da Anthropic para Claude Code, arquivos `CLAUDE.md` podem
importar outros arquivos com a sintaxe `@caminho/do/arquivo`. Assim, o Claude
continua encontrando `CLAUDE.md`, mas as instrucoes reais vivem em `AGENTS.md`.

## Como usar em plugins de IA do Obsidian

Plugins de IA da comunidade variam bastante. Alguns permitem escolher um arquivo
do vault como contexto fixo; outros oferecem apenas um campo de texto para
colar instrucoes.

Use a opcao que o plugin suportar:

- Se houver campo para arquivo, aponte para `AGENTS.md`.
- Se houver campo para contexto, instrucoes ou system prompt, cole o conteudo de
  `AGENTS.md`.
- Se o plugin aceitar prompts reutilizaveis, crie uma nota baseada em
  `90 - Modelos/Template - Prompt.md` e registre qual trecho de `AGENTS.md`
  foi usado.

Evite copiar o prompt para muitos lugares sem registrar onde ele foi colado.
Quanto mais copias soltas existirem, maior a chance de uma ferramenta seguir
instrucoes antigas.

## Conteudo inicial sugerido

O arquivo `AGENTS.md` ja vem preenchido com uma base para este vault. Voce pode
adapta-lo ao longo do tempo para refletir melhor sua forma de pensar, escrever e
trabalhar.

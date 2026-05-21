---
title: O que são system prompts de IA?
aliases:
  - System prompts
  - Instruções de IA
  - AGENTS.md
tags:
  - meta/documentacao
  - ia/configuracao
  - recurso/ferramenta
status: published
created: 2025-11-20
updated: 2026-05-18
category: conceito
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
---
# O que são system prompts de IA?

Um system prompt é um documento de instruções para assistentes de Inteligência
Artificial. Pense nele como o "manual de convivência" do seu vault: ele explica
como a IA deve agir, quais convenções deve respeitar e quais cuidados precisa
tomar ao ajudar você a organizar, escrever ou revisar notas.

Neste vault, o arquivo canônico é `AGENTS.md`, localizado na raiz do
repositório. Outras ferramentas podem usar arquivos de compatibilidade que
apontam para ele, como `CLAUDE.md` ou `GEMINI.md`, mas a ideia é manter um único
conteúdo principal para evitar divergência.

## Por que ele é importante?

Sem um prompt de projeto, uma IA trabalha de forma genérica. Ela não conhece a
estrutura PARA do vault, suas convenções de nomenclatura, o papel do Git no
processo de revisão, nem a filosofia por trás do seu jardim digital.

Um bom system prompt ajuda a IA a:

- **Respeitar suas convenções:** usar a estrutura PARA, seguir padrões de nomes
  e preservar links internos.
- **Entender seu workflow:** saber o que é um Rascunho Seguro (Branch) e uma
  Proposta de Melhoria (Pull Request).
- **Falar a sua língua:** usar analogias e termos que fazem sentido para você.
- **Ser uma ferramenta segura:** lembrar que o controle final continua sendo
  humano.

## Arquivos de compatibilidade

Algumas ferramentas procuram um nome de arquivo específico. Para evitar manter
várias cópias do mesmo prompt:

- `AGENTS.md` guarda o conteúdo principal.
- `GEMINI.md` é um link simbólico para `AGENTS.md`.
- `CLAUDE.md` usa o recurso de importação do Claude Code com `@AGENTS.md`.

Segundo a documentação da Anthropic para Claude Code, arquivos `CLAUDE.md` podem
importar outros arquivos com a sintaxe `@caminho/do/arquivo`. Assim, o Claude
continua encontrando `CLAUDE.md`, mas as instruções reais vivem em `AGENTS.md`.

## Como usar em plugins de IA do Obsidian

Plugins de IA da comunidade variam bastante. Alguns permitem escolher um arquivo
do vault como contexto fixo; outros oferecem apenas um campo de texto para
colar instruções.

Use a opção que o plugin suportar:

- Se houver campo para arquivo, aponte para `AGENTS.md`.
- Se houver campo para contexto, instruções ou system prompt, cole o conteúdo de
  `AGENTS.md`.
- Se o plugin aceitar prompts reutilizáveis, crie uma nota baseada em
  `90 - Modelos/Template - Prompt.md` e registre qual trecho de `AGENTS.md`
  foi usado.

Evite copiar o prompt para muitos lugares sem registrar onde ele foi colado.
Quanto mais cópias soltas existirem, maior a chance de uma ferramenta seguir
instruções antigas.

## Conteúdo inicial sugerido

O arquivo `AGENTS.md` já vem preenchido com uma base para este vault. Você pode
adaptá-lo ao longo do tempo para refletir melhor sua forma de pensar, escrever e
trabalhar.

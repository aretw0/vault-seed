---
title: Conhecendo o Agents Lab
aliases:
  - Agents Lab
  - Laboratório de Agentes
tags:
  - meta/ia
  - meta/agentes
  - meta/ecossistema
status: published
created: 2026-05-23
updated: 2026-05-23
category: referencia
audience: tecnico
related:
  - "[[Usando com Agentes de IA]]"
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Ecossistema aretw0 Agents Lab e Refarm]]"
---

# Conhecendo o Agents Lab

[`agents-lab`](https://github.com/aretw0/agents-lab) é outro projeto do mesmo
ecossistema. Ele funciona como laboratório para experimentar e curar capacidades
de agentes: skills, extensões, tools, prompts, pesquisas e testes sobre formas
mais confiáveis de trabalhar com IA no terminal.

Você não precisa do `agents-lab` para usar este vault. O vault já funciona com
Git, Obsidian, VS Code, GitHub Actions, Astro, Marimo e agentes que leem e
escrevem arquivos do repositório.

## Quando Ele Pode Ser Util

Use o `agents-lab` como referência quando quiser entender ou evoluir práticas
mais avançadas de agentes:

- criar skills reutilizáveis;
- estudar integrações entre agentes e ferramentas locais;
- testar guardrails e validações para automações;
- transformar um fluxo manual recorrente em uma capacidade versionada.

## Relação Com Este Vault

Este vault trata agentes pelo caminho mais simples e auditável: arquivos,
terminal, Git e validações locais. Um agente pode editar notas Markdown,
notebooks Marimo em Python, scripts e documentação; depois você revisa o diff
antes de commitar.

O `agents-lab` fica em outro repositório. Se alguma capacidade amadurecer lá,
ela pode inspirar melhorias neste vault, mas não é uma dependência para usar o
seu repositório de conhecimento. Veja também [[Ecossistema aretw0 Agents Lab e Refarm]] para a fronteira conceitual entre os projetos.

## Marimo E Agentes

Para notebooks Marimo, o caminho recomendado neste vault continua sendo:

1. editar o arquivo `.py`;
2. rodar `pnpm run notebooks:check`;
3. revisar o diff;
4. abrir `dgk lab <nome-do-notebook>` para inspecionar a experiência interativa;
5. publicar apenas quando o notebook entrar conscientemente em
   `.site/lab.notebooks.json`.

Integrações com runtime vivo do Marimo, como `marimo pair`, MCP ou ACP, podem
ser estudadas no ecossistema de agentes, mas devem continuar opcionais. Elas
servem para dar acesso a células, variáveis em memória e UI; não substituem o
fluxo versionado por arquivo.

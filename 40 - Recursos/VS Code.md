---
title: VS Code
aliases:
  - Visual Studio Code
tags:
  - ferramenta
  - vscode
  - recurso/ferramenta
status: published
created: 2026-05-18
updated: 2026-05-26
category: ferramenta
audience: iniciante
related:
  - "[[Integrando com VSCode (Foam)]]"
  - "[[Obsidian]]"
---
# VS Code

VS Code é um editor de código que também funciona bem para editar Markdown, revisar histórico Git e trabalhar com extensões como Foam.

Neste vault, ele é a opção mais técnica para quem quer combinar notas, automação, scripts e controle de versão no mesmo ambiente. Enquanto o [[Obsidian]] é melhor para leitura, backlinks e grafo visual, o VS Code é melhor para mudanças em lote, revisão de diffs, busca avançada e edição de arquivos de configuração.

## Quando usar

Use VS Code para:

- revisar commits e branches;
- editar muitos arquivos Markdown de uma vez;
- ajustar workflows, scripts e configuração do site;
- trabalhar com Foam e extensões de Markdown;
- diagnosticar problemas de build ou validação.

## Fluxo recomendado

Você pode alternar entre Obsidian e VS Code sem converter arquivos. Abra a mesma pasta nos dois aplicativos e deixe cada ferramenta fazer o que faz melhor. Depois de mudanças estruturais, rode `pnpm run validate` para verificar links, lint, tema, Mermaid, site e contratos do template.

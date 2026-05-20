---
title: Usando o Plugin Templates
aliases:
  - Plugin Templates
  - Templates Obsidian
tags:
  - obsidian/plugin
  - obsidian/templates
  - meta/guia
status: published
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Plugins Essenciais e Recomendados]]"
---
# Guia: Usando o Plugin Templates

O plugin nativo (core) "Templates" do Obsidian permite criar modelos de notas que podem ser inseridos rapidamente, economizando tempo e garantindo consistência em seu vault.

## 1. Como Habilitar o Plugin

1.  Vá para **Configurações** (`Settings` - ícone de engrenagem no canto inferior esquerdo).
2.  No menu lateral, clique em **Plugins nativos** (`Core Plugins`).
3.  Procure por **Templates** na lista e ative-o.

## 2. Como Configurar o Plugin

Após ativar, nas opções do plugin (`Configurações > Opções de plugins > Templates`), você encontrará:

-   **Pasta de templates** (`Template folder location`): Especifique a pasta onde você armazenará seus arquivos de template. A convenção neste vault é usar a pasta `90 - Templates`.
-   **Formato da data** (`Date format`): Defina como a variável `{{date}}` será formatada. O padrão é `YYYY-MM-DD`.
-   **Formato da hora** (`Time format`): Defina como a variável `{{time}}` será formatada. O padrão é `HH:mm`.

## 3. Como Criar um Arquivo de Template

1.  Navegue até a pasta que você configurou (ex: `90 - Templates`).
2.  Crie uma nova nota. O nome desta nota será o nome do seu template.
    -   *Exemplo: `Template - Anotação Diária.md`*
3.  Edite o conteúdo desta nota para criar seu modelo. Você pode usar texto, formatação Markdown e as variáveis disponíveis: `{{date}}`, `{{time}}`, e `{{title}}` (que insere o título da nota atual).

## 4. Como Usar um Template

1.  Crie ou abra a nota onde você deseja inserir o template.
2.  Abra a **Paleta de Comandos** (`Ctrl+P` ou `Cmd+P`).
3.  Digite "Template" e selecione **Templates: Inserir template** (`Templates: Insert template`).
4.  Uma lista dos seus templates aparecerá. Selecione o que deseja usar.
5.  O conteúdo do template será inserido na sua nota.

**Dica:** Você pode definir um atalho de teclado (hotkey) para o comando de inserção em `Configurações > Atalhos` para acesso ainda mais rápido.

---

## Exemplo Prático: O Template de Documentação de Prompt

Este vault já inclui um template para documentar prompts de IA, localizado em `90 - Templates/Template - Documentação de Prompt.md`. Ele foi construído usando os mesmos princípios descritos acima.

Para usá-lo:

1.  Crie uma nova nota para documentar seu prompt (ex: `Prompt - Resumo de Artigo.md`).
2.  Use a Paleta de Comandos para inserir o template `Template - Documentação de Prompt`.
3.  O template será aplicado, e você poderá preencher as seções (Objetivo, Prompt Enviado, Resultado, etc.).

Este é um ótimo exemplo de como os templates podem estruturar e padronizar a captura de conhecimento.

---
Voltar para o [[Guia do Jardineiro Digital]]
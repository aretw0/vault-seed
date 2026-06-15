---
title: Usando o Plugin Templates
aliases:
  - Plugin Templates
  - Templates Obsidian
tags:
  - obsidian/plugin
  - obsidian/templates
  - meta/guia
status: draft
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Plugins Essenciais e Recomendados]]"
  - "[[MOC Vault Seed]]"
---
# Guia: Usando o Plugin Templates

O plugin nativo (core) "Templates" do Obsidian permite inserir modelos simples de notas, economizando tempo sem exigir automação pesada. Os modelos em `90 - Modelos` usam variáveis básicas como `{{date}}` e `{{title}}`, então funcionam bem como ponto de partida para qualquer vault.

## 1. Como Habilitar o Plugin

1.  Vá para **Configurações** (`Settings` - ícone de engrenagem no canto inferior esquerdo).
2.  No menu lateral, clique em **Plugins nativos** (`Core Plugins`).
3.  Procure por **Templates** na lista e ative-o.

## 2. Como Configurar o Plugin

Após ativar, nas opções do plugin (`Configurações > Opções de plugins > Templates`), você encontrará:

-   **Pasta de templates** (`Template folder location`): Especifique a pasta onde você armazenará seus arquivos de template. A convenção neste vault é usar a pasta `90 - Modelos`.
-   **Formato da data** (`Date format`): Defina como a variável `{{date}}` será formatada. O padrão é `YYYY-MM-DD`.
-   **Formato da hora** (`Time format`): Defina como a variável `{{time}}` será formatada. O padrão é `HH:mm`.

## 3. Como Criar um Arquivo de Template

1.  Navegue até a pasta que você configurou (ex: `90 - Modelos`).
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

## Modelos Incluídos

| Modelo | Quando usar |
|---|---|
| `Template - Nota Diaria.md` | Captura diária simples, revisão e próximos passos. |
| `Template - Nota Conceitual.md` | Conceitos, ideias, referências e conexões. |
| `Template - MOC.md` | Mapas de conteúdo para organizar um território de notas. |
| `Template - Plano de Ação.md` | Projetos curtos, entregáveis e critérios de conclusão. |
| `Template - Dashboard.md` | Painéis pessoais com blocos Dataview opcionais. |
| `Template - Prompt.md` | Registro de prompts, contexto, resultado e ajustes. |
| `Template - Item de Feed.md` | Triagem de itens RSS/Atom com proveniência antes de virar nota. |
| `Template - Post Externo.md` | Rascunhos de outbox para adaptar notas canônicas a canais externos. |

## Exemplo Prático: O Template de Prompt

Para documentar um prompt de IA:

1. Crie uma nova nota, por exemplo `Prompt - Resumo de Artigo.md`.
2. Use a Paleta de Comandos para inserir `Template - Prompt`.
3. Preencha objetivo, contexto, prompt enviado, critérios de boa resposta e ajustes para a próxima versão.

Esse padrão mantém prompts auditáveis sem prender o vault a um fornecedor específico.

---
Voltar para o [[Guia do Jardineiro Digital]]
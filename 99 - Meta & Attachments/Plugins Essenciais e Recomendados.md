---
title: Plugins Essenciais e Recomendados
aliases:
  - Plugins Obsidian
  - Recomendações de Plugins
tags:
  - obsidian/plugin
  - obsidian/produtividade
status: published
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Evoluindo seu Vault com Links, Tags e MOCs]]"
  - "[[Usando o Plugin Templates]]"
---
# Plugins Essenciais e Recomendados

Os plugins do Obsidian expandem significativamente suas funcionalidades, permitindo personalizar o fluxo de trabalho, automatizar tarefas e criar visualizações dinâmicas. Eles transformam o Obsidian em uma ferramenta poderosa e adaptável às suas necessidades específicas, seja para organização pessoal, estudos ou projetos complexos. Explore os plugins para desbloquear todo o potencial do seu vault!

## Core (Ativar nas Configurações)

- `Daily Notes`: Essencial para o fluxo de trabalho diário. Configure para usar a pasta `10 - Fleeting & Daily` e um template.
- `Templates`: Para criar modelos de notas.
- `Backlinks` & `Outgoing Links`: Visualizar conexões.
- `Graph View`: Visualizar a rede de notas.
- `Quick Switcher`: Navegação rápida entre notas.

## Community (Instalar)

### Essenciais

- **`Obsidian Git`**: **Fundamental** para automatizar `git push/pull`. Configure para fazer commits e pushes automáticos em intervalos regulares ou ao fechar o Obsidian. Não substitui, o uso do Git no terminal ou cliente Git dedicado para operações mais complexas.
- **`Dataview`**: _Fundamental_ para criar visões dinâmicas do seu vault (listas, tabelas) baseadas em metadados (tags, links, campos YAML). **Indispensável** para escalar.
  - _Exemplo em um MOC:_
  ````markdown
  ```dataview
  LIST
  FROM #tipo/livro AND #status/lendo
  SORT file.ctime DESC
  ```
  ````
- **`Periodic Notes`**: Expande as Daily Notes para Semanal, Mensal, Anual, etc. (ótimo para revisões). Ótimo para planejamento e revisão.

### Recomendados

- **`Commander`**: Permite adicionar comandos (de plugins ou core) à interface do Obsidian (fita, barra de status, menus). Ótimo para otimizar o fluxo de trabalho.
- **`Style Settings`**: Permite customizar opções visuais de temas e plugins que o suportam, sem precisar escrever CSS.

### Opcionais (depende do uso)

- **`Templater`**: Versão mais poderosa do plugin de Templates, com funções dinâmicas. Essencial para automatizar a criação de notas.
- **`Calendar`**: Interface de calendário para navegar pelas Daily Notes.
- **`Kanban`**: Criar quadros Kanban dentro do Obsidian (útil para `20 - Projects`).
- **`Excalidraw`:** Para desenhos e diagramas baseados em vetor dentro do Obsidian.

---
Voltar para o [[Guia do Jardineiro Digital]]
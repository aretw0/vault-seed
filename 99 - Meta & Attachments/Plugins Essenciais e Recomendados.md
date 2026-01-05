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

## Como os Plugins são Gerenciados?

Para garantir a estabilidade e evitar conflitos ao sincronizar seu vault entre diferentes dispositivos, o ideal é que os arquivos dos plugins não sejam rastreados pelo Git. Apenas a lista de plugins ativados é mantida.

Isso significa que você precisará instalar os plugins da comunidade em cada dispositivo que usar.

## Core (Ativar nas Configurações)

- **`Bases`**: **A nova forma de organizar seu vault.** Permite criar visualizações de banco de dados (tabelas, cartões) a partir de suas notas e metadados. É a evolução do Dataview, com uma interface gráfica intuitiva e sem a necessidade de escrever código para a maioria das tarefas. **Comece por aqui.**
- **`Canvas`**: **Essencial para Dashboards Visuais.** Uma superfície infinita para organizar suas notas, imagens e ideias espacialmente.
- `Daily Notes`: Essencial para o fluxo de trabalho diário. Pode funcionar como seu **Dashboard (Daily Driver)** se configurado para abrir ao iniciar. Configure para usar a pasta `10 - Fleeting & Daily` e o template `Template - Nova Nota Diaria`.
- `Templates`: Para criar modelos de notas.
- `Backlinks` & `Outgoing Links`: Visualizar conexões.
- `Graph View`: Visualizar a rede de notas.
- `Quick Switcher`: Navegação rápida entre notas.

## Community (Instalar)

### Essenciais

- **`Obsidian Git`**: **Fundamental** para automatizar `git push/pull`. Configure para fazer commits e pushes automáticos em intervalos regulares ou ao fechar o Obsidian. Não substitui, o uso do Git no terminal ou cliente Git dedicado para operações mais complexas.
- **`Homepage`**: Transforma qualquer nota ou Canvas no ponto de entrada do seu cofre. Permite configurar o que abre ao iniciar o Obsidian. Fundamental para **Dashboards**.
- **`Dataview`**: Para usuários avançados que precisam de consultas complexas que o plugin `Bases` não consegue realizar através da sua interface. Permite criar visões dinâmicas usando uma linguagem de consulta (DQL).
  - _Exemplo em um MOC (hoje, isso pode ser feito de forma mais simples com o plugin `Bases`):_
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

- **`Templater`**: Versão mais poderosa do plugin de Templates. **Obrigatório** para os templates de Dashboard e Nota Diária incluídos neste seed funcionarem com datas dinâmicas.
- **`Calendar`**: Interface de calendário para navegar pelas Daily Notes.
- **`Kanban`**: Criar quadros Kanban dentro do Obsidian (útil para `20 - Projects`).
- **`Excalidraw`:** Para desenhos e diagramas baseados em vetor dentro do Obsidian.

### Automação e Fluxo (Avançado)

- **`QuickAdd`**: O "motor" de automação do seu vault. Permite criar macros, capturar informações rapidamente para notas específicas e automatizar fluxos de trabalho complexos.
- **`Meta Bind`**: A "interface" para suas automações. Permite criar botões, caixas de seleção e campos de texto diretamente em suas notas. Substitui o antigo plugin "Buttons". **Use em conjunto com o QuickAdd para criar Dashboards Acionáveis.**

---
Voltar para o [[Guia do Jardineiro Digital]]
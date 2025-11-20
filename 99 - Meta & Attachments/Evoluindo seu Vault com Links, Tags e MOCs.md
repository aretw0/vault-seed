---
title: Evoluindo seu Vault com Links, Tags e MOCs
aliases:
  - Links, Tags e MOCs
  - Organização Avançada
tags:
  - meta/organizacao
  - meta/workflow
  - obsidian/dataview
  - obsidian/bases
  - obsidian/moc
status: published
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: intermediario
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[O que são MOCs (Mapas de Conteúdo)]]"
  - "[[Templater]]"
  - "[[Links]]" # Referência a um conceito, não a um arquivo específico no vault
---
# Evoluindo seu Vault com Links, Tags e MOCs

A estrutura inicial é só um ponto de partida. A verdadeira organização emerge com o uso. Uma coisa é certa: seu vault crescerá! Veja como gerenciar isso sem **complicações excessivas** (over-engineering):

1.  **Comece com Notas Atômicas:** Em `40 - Resources/`, crie notas focadas em um único conceito ou ideia. Use títulos descritivos (ex: `[[Princípios do Atomic Design]]`, `[[Como fazer café coado V60]]`).

2.  **Link Abundantemente:** Ao escrever uma nota, crie links para conceitos relacionados (`[[Link Interno]]`). Conecte notas livremente. Use `[[Nova Nota]]` para criar stubs e preenchê-los depois. A estrutura emerge das conexões. Se a nota linkada não existir, o Obsidian facilita sua criação. _Esta é a principal forma de organização._

3.  **Use Tags Estrategicamente:** Tags (`#tag`) são ótimas para _status_, _tipos_ ou _contextos amplos_:
    - Status: `#status/processando`, `#status/concluido`, `#status/ideia`
    - Tipo: `#tipo/livro`, `#tipo/artigo`, `#tipo/pessoa`, `#tipo/conceito`
    - Contexto: `#contexto/trabalho`, `#contexto/pessoal`, `#contexto/saude`
    - Evite usar tags para tudo; prefira links para conexões conceituais.

4.  **Crie MOCs (Maps of Content):** Quando um tópico começa a ter muitas notas relacionadas, crie uma nota "índice" chamada [[O que são MOCs (Mapas de Conteúdo)|MOC]]. Ex: `[[MOC Produtividade]]`. Esta nota conterá links para as notas principais sobre produtividade, talvez com uma breve descrição. MOCs são como índices curados e emergentes. MOCs são cruciais para a navegação e a **curadoria** (stewardship) do seu vault à medida que ele cresce. Eles podem viver em `40 - Resources/` ou em `99 - Meta & Attachments/` se preferir.

5.  **Reavalie Pastas:** _Só_ use pastas quando um conjunto de notas _realmente_ pertence a um contexto isolado (como um grande projeto com muitos arquivos específicos ou aulas de um curso), e a navegação por links/MOCs começar a parecer insuficiente. Não tenha medo de mover arquivos ou refatorar pastas se a estrutura atual não fizer mais sentido. Exemplos:
    - `20 - Projects/Nome do Projeto Grande/`
    - `30 - Areas/Saúde e Fitness/`
    - Muitas vezes, um MOC (`[[MOC Projeto X]]`, `[[MOC Saúde]]`) é suficiente. Pergunte-se: "Essa pasta realmente me ajuda a encontrar ou organizar melhor do que um MOC ou tag faria?".

6.  **Refine Templates:** À medida que seus processos de anotação se solidificam, melhore seus templates em `90 - Templates/` usando plugins como o [[Templater]] para automações mais poderosas.

7.  **Crie Vistas Dinâmicas com `Bases` e `Dataview`**:
    - **Comece com `Bases` (Plugin Nativo):** Esta é a ferramenta recomendada para começar. `Bases` permite que você crie visualizações de banco de dados (tabelas, cartões) de suas notas de forma visual e intuitiva, sem precisar de código. É perfeito para criar dashboards de projetos, listas de leitura, etc.
    - **Use `Dataview` para Consultas Avançadas:** Se você precisar de uma lógica de consulta que `Bases` não suporta (como extrair informações do *corpo* da nota ou lógicas muito complexas), o `Dataview` é a ferramenta. Ele usa uma linguagem de consulta própria.
    - Exemplo de Bloco Dataview (em uma nota `[[Dashboard Projetos]]`):
      ````markdown
      ```dataview
      TABLE status, deadline
      FROM "20 - Projects"
      WHERE contains(file.tags, "#status/em-progresso")
      SORT deadline ASC
      ```
      ````
      *Com o plugin `Bases`, você alcançaria um resultado similar criando uma nova "Base", adicionando a pasta "20 - Projects" como fonte de dados e aplicando um filtro visual pela tag `#status/em-progresso`.*

---
Voltar para o [[Guia do Jardineiro Digital]]
---
title: Convenções e Boas Práticas
aliases:
  - Boas Práticas do Vault
  - Convenções do Vault
tags:
  - meta/organizacao
  - meta/workflow
  - iniciante
status: published
created: 2023-10-27
updated: 2023-10-27
category: guia
audience: iniciante
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Links]]"
  - "[[O que são MOCs (Mapas de Conteúdo)]]"
  - "[[Templater]]"
  - "[[Dataview]]"
---
# Convenções e Boas Práticas

Para manter a consistência e a eficiência do seu jardim digital, estas são as convenções e boas práticas recomendadas. Elas servem como um guia para garantir que seu conhecimento permaneça organizado e fácil de navegar à medida que cresce.

**Analogia:** Pense nestas convenções como as "regras de jardinagem" do seu vault. Elas garantem que as plantas certas cresçam nos lugares certos, que as etiquetas sejam claras e que as ferramentas sejam usadas de forma consistente.

---

## Convenções de Nomeação

Nomes claros e consistentes são a base de um vault organizado.

-   **Títulos de Notas:** Devem ser descritivos e atômicos. Pense neles como o nome de uma única espécie de planta.
    -   **Exemplos:** `Princípios do Atomic Design`, `Como fazer café coado V60`, `O que é o método Zettelkasten`.
    -   **Notas Diárias:** Use o formato `YYYY-MM-DD` para fácil ordenação. Ex: `2025-09-11.md`.

-   **Pastas:** Numeradas para manter uma ordem visual consistente no explorador de arquivos, seguindo a metodologia PARA.
    -   **Exemplos:** `00 - Inbox`, `10 - Fleeting & Daily`, `20 - Projects`.

-   **Templates:** Use o prefixo `Template -` para identificar facilmente os modelos de notas.
    -   **Exemplos:** `Template - Nota Conceitual`, `Template - Plano de Ação`.

---

## Uso de Links (Wikilinks)

Os links são as raízes e os galhos que conectam seu jardim.

-   **Links Internos vs. Externos:** Use `[[Wikilinks]]` para conectar-se a outras notas dentro do seu vault. Para sites e recursos externos, use links de Markdown padrão: `[Texto do Link](https://exemplo.com)`.

-   **Aliases para Clareza:** Use aliases (`|`) para tornar o texto mais fluido e natural, sem alterar o nome do arquivo de destino.
    -   **Exemplo:** Em vez de escrever "Eu estava lendo sobre [[O que é o método PARA]]", você pode escrever "Eu estava lendo sobre o [[O que é o método PARA|método PARA]]". O link ainda aponta para o mesmo arquivo, mas o texto exibido é mais limpo.

---

## Uso de Tags

Tags são como etiquetas coloridas que você coloca em suas plantas para uma categorização rápida e visual. Elas são ideais para **status, tipos ou contextos**.

-   **Estrutura:** Use o formato `prefixo/detalhe` para criar grupos de tags.
    -   `#status/ideia`, `#status/em-progresso`, `#status/concluido`
    -   `#tipo/livro`, `#tipo/artigo`, `#tipo/pessoa`, `#tipo/conceito`
    -   `#contexto/trabalho`, `#contexto/pessoal`, `#contexto/saude`

-   **Links vs. Tags:** Lembre-se da regra de ouro:
    -   Use **Links** para conectar **conceitos** (uma nota está relacionada a outra).
    -   Use **Tags** para agrupar notas em **categorias amplas** (esta nota *é um* livro, esta nota *está em* progresso).

---

## Metadados (YAML Frontmatter)

O Frontmatter é um pequeno bloco de texto no topo de suas notas que contém metadados estruturados. É como a "ficha técnica" da sua planta.

-   **O que é?** Um bloco de texto entre `---` no início do arquivo.
-   **Por que usar?** Permite adicionar informações como aliases, tags de forma estruturada, datas, etc. É extremamente útil para plugins como o `Dataview`.

-   **Exemplo de Frontmatter:**
    ```yaml
    ---
    aliases: [PARA, Método PARA]
    tags: [tipo/metodologia, status/concluido]
    created: 2025-09-11
    ---
    # O que é o método PARA
    ...conteúdo da nota...
    ```
    Neste exemplo, a nota pode ser encontrada procurando por `PARA` e as tags são aplicadas sem poluir o corpo do texto.

---

## Gestão de Tarefas

-   **Formato Básico:** Use a sintaxe de tarefas do Markdown para criar caixas de seleção.
    -   `- [ ] Tarefa a fazer.`
    -   `- [x] Tarefa concluída.`

-   **Contexto:** Coloque tarefas dentro das notas às quais elas se referem (ex: em uma nota de projeto, ou em uma nota de reunião). Para tarefas do dia, use sua `Daily Note`.

---
Voltar para o [[Guia do Jardineiro Digital]]
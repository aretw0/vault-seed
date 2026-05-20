---
title: Dataview
aliases:
  - Plugin Dataview
tags:
  - obsidian/dataview
  - tipo/conceito
status: published
created: 2026-05-19
updated: 2026-05-19
category: conceito
audience: intermediario
related:
  - "[[Obsidian]]"
  - "[[Bases]]"
  - "[[MOC Vault Seed]]"
---

# Dataview

Dataview e um plugin da comunidade que transforma propriedades, tags, links e metadados de arquivos em consultas dentro de notas Markdown.

Use Dataview quando precisar de consultas mais expressivas do que uma Base visual oferece. Para usuarios iniciantes, comece por [[Bases]] e deixe Dataview para dashboards, revisoes e listas que precisam de mais logica.

## DQL

A sintaxe mais comum e a DQL, escrita em blocos de codigo `dataview`. Uma consulta costuma seguir esta ordem:

1. tipo de saida: `TABLE`, `LIST`, `TASK` ou `CALENDAR`;
2. fonte opcional: `FROM`, usando pasta, tag ou link;
3. filtros opcionais: `WHERE`;
4. organizacao opcional: `SORT`, `GROUP BY`, `LIMIT`.

Exemplo com duas pastas como fonte:

```dataview
TABLE status AS "Status", category AS "Categoria", audience AS "Publico"
FROM "99 - Meta e Anexos" or "40 - Recursos"
WHERE status = "published"
SORT file.name ASC
```

Exemplo de lista por tag:

```dataview
LIST
FROM #obsidian/dataview or #obsidian/bases
SORT file.name ASC
```

Dataview tambem entende propriedades do arquivo, como `file.name`, `file.link`, `file.folder` e `file.mtime`, alem das propriedades que voce coloca no frontmatter das notas.

## Cuidados

- Dataview depende de plugin instalado em cada dispositivo.
- Blocos `dataviewjs` executam JavaScript. Use apenas codigo que voce entende.
- Consultas muito complexas podem deixar notas lentas.
- Se uma lista for essencial para entender o vault, mantenha tambem uma curadoria manual em um MOC.

## Referencias

- [Dataview: estrutura de uma consulta](https://blacksmithgu.github.io/obsidian-dataview/queries/structure/)
- [Dataview: DQL, JS e inline queries](https://blacksmithgu.github.io/obsidian-dataview/queries/dql-js-inline/)

---

Voltar para [[MOC Vault Seed]]

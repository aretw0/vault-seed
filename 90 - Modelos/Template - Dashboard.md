---
title: "Dashboard - {{title}}"
created: "{{date}}"
updated: "{{date}}"
tags:
  - tipo/dashboard
status: draft
category: dashboard
audience: pessoal
---

# Dashboard - {{title}}

> [!note] Como usar
> Este painel pode começar simples. Ative blocos Dataview apenas se o plugin estiver instalado.

## Foco atual

-

## Projetos em andamento

```dataview
TABLE status, prazo, prioridade
FROM "20 - Projetos"
WHERE status != "done"
SORT prazo ASC
LIMIT 10
```

## Áreas para revisar

```dataview
LIST
FROM "30 - Áreas"
SORT file.mtime ASC
LIMIT 10
```

## Próximas ações

- [ ]

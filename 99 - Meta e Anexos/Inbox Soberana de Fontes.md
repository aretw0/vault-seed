---
title: Inbox Soberana de Fontes
aliases:
  - Inbox de Fontes
  - Triagem de Feeds
  - Inbox Soberana
status: published
created: 2026-05-26
updated: 2026-05-26
tags:
  - meta/dados
  - meta/workflow
  - meta/ia
category: workflow
audience: todos
related:
  - "[[Publicando e Consumindo RSS no Vault]]"
  - "[[Coletando Dados Locais com Scraping e OCR]]"
  - "[[Usando com Agentes de IA]]"
---

# Inbox Soberana de Fontes

A inbox soberana é o lugar onde uma fonte externa entra antes de virar
conhecimento do vault. Ela evita dois extremos ruins: guardar tudo sem triagem
ou deixar uma automação publicar notas sem revisão.

O fluxo recomendado é:

```text
feed/API/scraping/OCR → snapshot com proveniência → 00 - Entrada → revisão → nota conectada
```

## Onde Guardar

Use `00 - Entrada/` para itens candidatos. Eles podem ser criados manualmente,
por um notebook local ou por um agente, mas devem começar como `status: draft`.

Use o template:

```text
90 - Modelos/Template - Item de Feed.md
```

## Campos De Proveniência

Todo item derivado de fonte externa deve preservar, quando possível:

| Campo | Uso |
| --- | --- |
| `source` | URL, arquivo ou API de origem |
| `collectedAt` | quando o dado foi coletado |
| `sha256` | fingerprint do snapshot ou item bruto |
| `license` | licença, termos ou `verificar` |
| `privacy` | `public`, `private-until-published`, `sensitive` ou descrição própria |

Esses campos tornam a nota auditável: outra pessoa consegue entender de onde o
dado veio, quando foi coletado e qual era o limite de publicação.

## Handoff Com Agentes

Quando usar agente, dê a ele uma tarefa estreita: transformar um item em uma
nota candidata, sem publicar e sem inventar contexto.

Prompt disponível:

```text
.github/prompts/feed-item-to-note.prompt.md
```

Critério de aceite para o agente:

- a nota fica em `00 - Entrada/`;
- `status` continua `draft`;
- a fonte original está preservada;
- sugestões de links aparecem como sugestões, não como fatos;
- a decisão final fica para uma pessoa.

## Decisão Editorial

Durante a revisão, escolha uma saída:

- **manter como fonte:** a nota continua como referência bruta ou clipping;
- **transformar:** vira nota conceitual, guia, recurso ou projeto;
- **conectar:** recebe links para MOCs e notas existentes;
- **descartar:** sai da inbox quando não há valor ou direito claro de uso.

O objetivo não é transformar todo feed em conteúdo. O objetivo é manter um rastro
auditável para aquilo que realmente alimenta o jardim digital.

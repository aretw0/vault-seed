---
title: Outbox Soberana de Publicação
aliases:
  - Outbox Soberana
  - Fila de Publicação Externa
status: published
created: 2026-05-26
updated: 2026-05-26
tags:
  - meta/dados
  - meta/workflow
  - meta/ia
  - meta/site
category: workflow
audience: todos
related:
  - "[[Inbox Soberana de Fontes]]"
  - "[[Publicando e Consumindo RSS no Vault]]"
  - "[[Usando com Agentes de IA]]"
---

# Outbox Soberana de Publicação

A outbox soberana é a fronteira entre o vault e plataformas externas. Ela existe
para garantir que o vault continue sendo a fonte de verdade, enquanto redes
sociais, newsletters e APIs viram apenas adaptadores de distribuição.

O fluxo recomendado é:

```text
nota canônica → rascunho por canal → revisão humana → publicação externa → link de volta
```

## Por Que Não Começar Pela Rede Social

Redes sociais são superfícies úteis, mas frágeis: regras mudam, APIs fecham,
formatos variam e o histórico pode desaparecer. Por isso, o solo vem antes:

- notas em Markdown continuam auditáveis;
- snapshots preservam origem e fingerprint;
- RSS mantém uma via aberta de distribuição;
- agentes trabalham em rascunhos, não em publicação automática;
- cada plataforma recebe uma adaptação, não a fonte de verdade.

## Como Um Item Entra Na Outbox

Crie uma nota em `00 - Entrada/` com o template:

```text
90 - Modelos/Template - Post Externo.md
```

O dataset do Lab é gerado por:

```bash
pnpm run outbox:prepare
```

O script procura notas com pelo menos um destes sinais no frontmatter:

- `outbox: true`;
- `publicationStatus`;
- `channels`.

Depois ele gera:

```text
dados/lab/outbox-publicacao.json
```

## Campos De Controle

| Campo | Função |
| --- | --- |
| `canonical` | nota ou URL que continua sendo a referência principal |
| `source` | snapshot, feed, API ou nota que originou o rascunho |
| `collectedAt` | momento da coleta ou derivação |
| `sha256` | fingerprint do item ou da nota |
| `license` | licença, termos ou `verificar` |
| `privacy` | limite de exposição antes de publicar |
| `channels` | canais candidatos, como `rss`, `mastodon`, `newsletter` |
| `publicationStatus` | `draft`, `review`, `scheduled`, `published` ou `blocked` |

## Notebook De Revisão

O Lab publica a fila em:

```text
/lab/outbox.html
```

Use esse notebook para revisar:

- candidatos pendentes;
- canais declarados;
- política de dry-run;
- riscos de privacidade/licença;
- checklist antes de publicar.

## Handoff Com Agentes

Quando um agente ajudar, a tarefa deve ser estreita: adaptar uma nota canônica
para rascunhos por canal, sem postar em lugar nenhum.

Prompt disponível:

```text
.github/prompts/note-to-outbox-post.prompt.md
```

Critérios de aceite:

- arquivo criado em `00 - Entrada/`;
- `status: draft` e `publicationStatus: draft`;
- campos de proveniência preservados;
- riscos anotados no checklist;
- nenhuma chamada a API externa;
- decisão final feita por uma pessoa.

## Regra De Ouro

A publicação externa pode amplificar o jardim, mas não deve governá-lo. Se uma
plataforma cair ou mudar, o vault precisa continuar legível, versionado e capaz
de republicar por outro adaptador.

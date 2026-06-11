---
title: Bem-vindo ao seu vault
tags:
  - meta/onboarding
status: published
category: guia
audience: todos
---

# Bem-vindo ao seu vault

Seu vault foi inicializado com sucesso. Aqui está um mapa rápido do que foi preparado para você:

## O que foi configurado automaticamente

| Recurso | O que faz |
|---|---|
| **GitHub Pages** | Publica este vault como site. Acesse em `https://<seu-usuario>.github.io/<repositório>/` |
| **Pipeline ETL** | Coleta e processa dados do vault diariamente via GitHub Actions |
| **Notebooks Marimo** | Ambiente de análise em Python em `99 - Meta e Anexos/Notebooks/` |
| **dgk CLI** | Ferramentas de linha de comando — `dgk lab etl`, `dgk lab open`, `dgk check` |

## Estrutura PARA

Seu vault segue o método PARA para organizar o conhecimento:

- `10 - Projetos/` — trabalho ativo com prazo e objetivo
- `20 - Áreas/` — responsabilidades contínuas sem prazo definido
- `30 - Arquivo/` — material inativo para referência futura
- `40 - Recursos/` — notas de conceitos e ferramentas (em rascunho — edite e publique o que fizer sentido)
- `99 - Meta e Anexos/` — documentação do próprio vault

## Primeiros passos

1. **Edite esta nota** — customize a apresentação do seu vault
2. **Explore `99 - Meta e Anexos/99.1 - Onboarding/`** — guias detalhados de configuração
3. **Crie sua primeira nota** — use `Ctrl+N` no Obsidian ou `dgk lab note create`
4. **Promova uma nota** — quando quiser publicar, mude `status: draft` para `status: published` no frontmatter

## Publicação

Esta é a única nota publicada por padrão. As notas em `40 - Recursos/` estão como `status: draft` — elas ficam no vault mas não aparecem no site até você promovê-las.

Para publicar em outros canais (RSS, Mastodon, newsletter), adicione ao frontmatter:

```yaml
outbox: true
channels:
  - site
  - rss
```

Veja [[O que é publicação multi-canal]] e [[Outbox Soberana de Publicação]] para mais detalhes.

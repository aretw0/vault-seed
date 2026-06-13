---
name: vault-context
description: Conhece a estrutura do vault do usuário — organização PARA, convenções de frontmatter e ferramentas CLI disponíveis
version: 0.1.0
---

# Vault Context

## Organização PARA

O vault usa o **método PARA**:

| Pasta | Propósito |
| --- | --- |
| `00 - Projects` | Trabalhos ativos com prazo |
| `10 - Areas` | Responsabilidades contínuas (sem prazo) |
| `20 - Resources` | Material de referência e tópicos de interesse |
| `90 - Archive` | Itens inativos ou concluídos |
| `99 - Meta e Anexos` | Templates, notebooks e meta-arquivos do vault |

## Convenções de Nota

As notas são arquivos Markdown com YAML frontmatter:

```yaml
---
title: Título da Nota
status: draft | active | published | archived
tags: [tag1, tag2]
channels:
  site: { status: ready }
  mastodon: { status: draft }
  newsletter: { status: hold }
---
```

O campo `status` controla o fluxo editorial. `channels` define onde a nota será publicada.

## Comandos CLI

```bash
dgk etl                    # reconstrói todos os dados do vault (grafo, feeds, outbox)
dgk lab list                   # lista notebooks disponíveis
dgk lab open <notebook>        # abre notebook interativo
dgk lab open-vault             # abre vault no Obsidian
dgk lab note <cmd> ...         # passa comando para o Obsidian CLI (requer Obsidian 1.12+)
```

## Notebooks do Lab

Notebooks interativos em `99 - Meta e Anexos/Notebooks/`:

| Nome | Função |
| --- | --- |
| `analise-feeds` | Análise de feeds RSS |
| `analise-outbox` | Fila de publicação multi-canal |
| `analise-grafo` | Visualização do grafo de conhecimento |
| `etl-demo` | Pipeline extract/transform/load |
| `curadoria-feeds-ia` | Curadoria de feeds com Claude API |
| `apresentacao-vault-seed` | Visão geral do arcabouço modular |

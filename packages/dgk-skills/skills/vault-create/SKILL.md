---
name: vault-create
description: Cria novas notas no vault do usuário a partir de templates, preservando a estrutura PARA e as convenções de frontmatter
version: 0.1.0
---

# Vault Create

Crie uma nota com `dgk lab note create`:

```bash
dgk lab note create name="Título" folder="20 - Resources" content="# Título\n\nconteúdo"
```

## Template de frontmatter

Inclua sempre no início do `content`:

```yaml
---
title: Título da Nota
status: draft
tags: []
---
```

## Diretrizes de pasta (PARA)

| Conteúdo | Pasta |
| --- | --- |
| Nova pesquisa ou referência | `20 - Resources/<tópico>/` |
| Projeto ativo com prazo | `00 - Projects/<nome-do-projeto>/` |
| Responsabilidade contínua | `10 - Areas/<área>/` |
| Trabalho concluído | `90 - Archive/` |
| Captura rápida do dia | `90 - Archive/Daily/` |

## Boas práticas

- Sempre inclua `title` e `status: draft` no frontmatter
- Sugira tags existentes no vault — use `dgk lab note tags total` para ver as disponíveis
- Nomeie o arquivo em kebab-case: `aprendizado-maquina.md`
- Adicione wikilinks `[[nota-relacionada]]` para conectar ao grafo de conhecimento

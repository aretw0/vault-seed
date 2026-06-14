---
name: vault-read
description: Lê o conteúdo completo de uma nota no vault do usuário pelo nome ou caminho
version: 0.1.0
---

# Vault Read

Leia uma nota com `dgk lab note read`:

```bash
dgk lab note read name="Título da Nota"
dgk lab note read name="20 - Resources/Topico/nome-da-nota"  # com caminho relativo
```

A resposta inclui o YAML frontmatter e o corpo Markdown da nota.

## Fluxo recomendado

**Pesquise antes de ler.** Use `vault-search` para encontrar candidatos, depois leia os mais relevantes. Evite tentar ler notas cuja existência não foi confirmada — o Obsidian CLI retorna erro se o nome não for exato.

## Extração de informações

Após ler, extraia:
- `status` do frontmatter para saber o estado editorial
- `tags` para entender o contexto do conteúdo
- `channels` para entender onde já foi ou será publicado
- Wikilinks `[[nome]]` no corpo para identificar notas relacionadas

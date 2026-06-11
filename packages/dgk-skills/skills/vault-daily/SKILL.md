---
name: vault-daily
description: Acessa e atualiza a nota diária do usuário — a caixa de entrada para capturas rápidas e reflexões do dia
version: 0.1.0
---

# Vault Daily

A nota diária é a caixa de entrada principal. Acesse com:

```bash
dgk lab note open-daily                                          # abre a nota de hoje no Obsidian
dgk lab note read name="2026-06-10"                             # lê a nota de hoje
dgk lab note append name="2026-06-10" content="- [ ] nova tarefa"  # adiciona à nota do dia
```

As notas diárias seguem o padrão de nome `YYYY-MM-DD.md` e ficam em `90 - Archive/Daily/` (ou na pasta configurada no Obsidian para notas diárias).

## Quando usar

| Situação | Ação |
| --- | --- |
| "Anota isso para mim" | `append` na nota de hoje |
| "O que eu capturei ontem?" | `read` da data anterior |
| "Cria uma nota de reunião" | `create` em `00 - Projects/<projeto>/` |
| "Abre minha nota do dia" | `open-daily` |

## Padrão de conteúdo diário

```markdown
## Capturas

- ideia ou tarefa capturada

## Notas de reunião

### [[reuniao-projeto-x]]
```

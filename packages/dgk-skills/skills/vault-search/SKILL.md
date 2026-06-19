---
name: vault-search
description: Busca notas no vault do usuário por palavra-chave, tag ou texto completo usando o Obsidian CLI
version: 0.1.0
---

# Vault Search

Busque notas com `dgk lab note search`:

```bash
dgk lab note search query="aprendizado de máquina"   # busca full-text
dgk lab note search tags="ia,pkm"                    # filtro por tags
dgk lab note search folder="20 - Resources"          # filtro por pasta
```

O resultado lista os nomes e caminhos das notas correspondentes.

## Fluxo recomendado

1. Tente `query=` com o termo principal
2. Se nenhum resultado, tente sinônimos ou termos em inglês
3. Use `tags=` quando o usuário mencionar tags explicitamente
4. Combine filtros para refinar: `dgk lab note search query="OCR" folder="20 - Resources"`

## Pré-requisito

O Obsidian deve estar em execução com o CLI registrado. Se o comando falhar, execute `dgk lab open-vault` primeiro e repita.

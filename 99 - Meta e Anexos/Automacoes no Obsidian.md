---
title: Automações no Obsidian
aliases:
  - Botões no Obsidian
  - Shell Commands Obsidian
tags:
  - meta/obsidian
  - meta/automacao
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Usando com Agentes de IA]]"
---
# Automações no Obsidian

Configure botões na interface do Obsidian para rodar automações do vault
sem precisar abrir o terminal.

## Plugins necessários

Instale via **Settings → Community Plugins → Browse**:

| Plugin | ID no marketplace | Função |
|---|---|---|
| Shell Commands | `obsidian-shellcommands` | Executa scripts shell |
| Commander | `cmdr` | Adiciona botões à ribbon e toolbars |
| Templater | `templater-obsidian` | Botões em notas via templates |
| Obsidian Git | `obsidian-git` | Operações Git pela interface |

## Botões técnicos (Shell Commands + Commander)

Estes botões aparecem na ribbon lateral do Obsidian e rodam os scripts em
`scripts/obsidian/`.

### Configuração rápida pela interface

1. Instale o plugin **Shell Commands** e ative-o.
2. Acesse **Settings → Shell Commands**.
3. Clique em **New shell command** e adicione:
   - **Comando:** `bash '{{vault_path}}/scripts/obsidian/validate.sh'`
   - **Alias:** `Validar vault`
4. Repita para os outros dois:
   - `bash '{{vault_path}}/scripts/obsidian/lint.sh'` → `Lint`
   - `bash '{{vault_path}}/scripts/obsidian/check.sh'` → `Verificar saúde`
5. Instale o plugin **Commander** e ative-o.
6. Acesse **Settings → Commander**.
7. Em **Ribbon**, adicione os três comandos Shell Commands criados acima.

### Configuração via arquivo (avançado)

Copie os arquivos de exemplo para os diretórios dos plugins **após** instalá-los:

```bash
# Ajuste os caminhos conforme seu sistema
cp "99 - Meta e Anexos/config/shell-commands-example.json" \
   ".obsidian/plugins/obsidian-shellcommands/data.json"

cp "99 - Meta e Anexos/config/commander-example.json" \
   ".obsidian/plugins/cmdr/data.json"
```

> Os IDs dos comandos no commander-example.json (`shell-command-0`, etc.)
> devem corresponder aos IDs gerados pelo Shell Commands. Se usar a interface
> para criar os comandos, os IDs podem ser diferentes — ajuste o commander
> manualmente ou use a interface do Commander para vincular.

## Botões de PKM (Templater)

Com o **Templater** instalado, você pode criar botões em notas que geram novas
notas nas pastas certas:

### Template: Nova nota no Inbox

Crie `99 - Meta e Anexos/Templates/Nova nota inbox.md`:

```
---
title: <% tp.file.rename(await tp.system.prompt("Título da nota")) %>
tags:
  - inbox
created: <% tp.date.now("YYYY-MM-DD") %>
status: rascunho
---
# <% tp.file.title %>

```

Configure o Templater para usar `99 - Meta e Anexos/Templates/` como
pasta de templates e `00 - Entrada/` como pasta de destino padrão.

## Obsidian Git — sincronização pela interface

Com o plugin **Obsidian Git**:
- `Ctrl+P` → `Obsidian Git: Pull` — sincroniza antes de editar
- `Ctrl+P` → `Obsidian Git: Commit-and-sync` — salva e sincroniza

Configure em **Settings → Obsidian Git** para pull automático ao abrir o vault
e commit automático ao fechar.

---
Voltar para [[Preparando seu Computador para o Vault]]

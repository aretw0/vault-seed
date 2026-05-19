# Design: Setup UX e Sandbox para Agentes

**Data:** 2026-05-19
**Status:** Aprovado
**Escopo:** Minor release — vault-seed v0.3.x (patch ou v0.4)

## Resumo

Tornar os dois caminhos de setup (devcontainer e local) visíveis e bem documentados
para qualquer perfil de usuário do vault. Melhorar a robustez do devcontainer com
health checks. Preparar o vault como sandbox agnóstico para agentes de IA.

O vault-seed atende três perfis simultâneos:

| Perfil | Prioridade de setup |
|---|---|
| Jardineiro técnico | VS Code + devcontainer ou scripts locais |
| Jardineiro híbrido | Obsidian primário, terminal opcional |
| Operador de agentes | Setup rápido para agentes, vault como memória contextual |

---

## 1. README e Navegação por Persona

### `README.template.md` (vai para o usuário)

Ganha uma seção "Como Começar" no topo, antes do conteúdo atual:

```markdown
## Como Começar

| Quero... | Caminho |
|---|---|
| Usar só o Obsidian, sem terminal | Instale o Obsidian e abra esta pasta |
| VS Code + scripts locais | [[Configurando Localmente]] |
| Devcontainer (VS Code + Docker) | [[Configurando com Devcontainer]] |
| Usar com agentes de IA | [[Usando com Agentes de IA]] |

Os guias detalhados estão em `99 - Meta & Attachments/`.
```

Nenhuma outra mudança estrutural — filosofia PARA, Obsidian e VS Code Foam permanecem.

### `README.md` (template — para contribuidores)

Seção equivalente orientada a quem desenvolve o vault-seed, com links para
`docs/compatibilidade-de-ambiente-e-setup.md` e os guias de contribuição.

---

## 2. Guias de Setup para o Usuário

Todos em `99 - Meta & Attachments/` — sobrevivem ao `initialize.yml`.

### `Preparando seu Computador para o Vault.md` (atualizado)

Reescrito como **decisor/índice**. Responde: "como quero trabalhar com este vault?"
O conteúdo técnico de setup local migra para `Configurando Localmente.md`.

Estrutura:
1. Tabela de caminhos (mesma do README)
2. Um parágrafo por caminho explicando quando escolhê-lo
3. Links wikilink para os guias detalhados

### `Configurando Localmente.md` (novo)

Recebe o conteúdo atual de `Preparando seu Computador...` sobre setup local:
- Instalar fnm (Windows: winget, macOS: brew, Linux: curl)
- Instalar uv (Windows: winget, macOS: brew, Linux: curl)
- Instalar Python 3
- Rodar `bash scripts/setup.sh`
- O que esperar ao final

### `Configurando com Devcontainer.md` (novo)

Explica o caminho do devcontainer sem jargão de Docker:
- O que é e o que vem pré-instalado (Node 22, uv, pnpm, extensões VS Code: Foam, markdownlint, Prettier)
- Como abrir: "Reopen in Container" no VS Code
- O que esperar durante a instalação
- Leitura do readiness gate (mensagem `=== Ambiente pronto ===`)
- Requisitos: VS Code + extensão Dev Containers + Docker Desktop

### `Usando com Agentes de IA.md` (novo)

Filosofia e prática — agnóstico de ferramenta:
- **O vault é a memória do agente**: usar notas, projetos e áreas do PARA para estruturar contexto, decisões e tarefas do agente
- Como organizar trabalho com agentes dentro da estrutura existente (sem pastas ocultas, sem arquivos de estado externos)
- O vault funciona com qualquer agente que leia arquivos (Claude Code, Codex CLI, Gemini CLI, etc.)
- Dica: manter um arquivo de "contexto ativo" em `00 - Inbox/` para handoff entre sessões

---

## 3. Devcontainer: Robustez

### `post-create.sh` (modificado — readiness gate)

Adiciona ao final do script existente:

```bash
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "======================="
```

Confirma visualmente que todas as ferramentas foram instaladas. Não falha — apenas informa.

### `.devcontainer/post-start.sh` (novo)

Executa toda vez que o container é iniciado (não só na criação).
Health check não-bloqueante — nunca faz `exit 1`:

```bash
#!/bin/bash
# Health check ao retomar o container — informativo, nunca bloqueante

if [ ! -d "node_modules" ]; then
  echo "[aviso] node_modules ausente. Execute: pnpm install"
fi

if ! git config commit.template &>/dev/null; then
  echo "[aviso] Git hooks ausentes. Executando setup_git.sh..."
  bash scripts/setup_git.sh
fi

echo "[devcontainer] Container pronto."
```

Inspirado no padrão do refarm mas sem SSH fallback, retry logic ou validação de tokens
— escopo adequado para um template PKM.

---

## 4. Sandbox para Agentes

### `.claude/settings.local.json` (novo — vai para o usuário)

Allowlist mínima para Claude Code operar no vault sem prompts repetitivos:

```json
{
  "permissions": {
    "allow": [
      "Read(**/*)",
      "Edit(**/*.md)",
      "Bash(pnpm run *)",
      "Bash(bash scripts/*)"
    ]
  }
}
```

Cobre: leitura de qualquer arquivo, edição de notas Markdown, execução dos scripts de
setup e dos scripts pnpm. Operações destrutivas (git push, rm) continuam pedindo
confirmação. O usuário ajusta livremente.

Não está em `files_to_remove` — vai para o usuário. Usuários que não usam Claude Code
podem ignorar ou apagar o arquivo sem consequências.

### `AGENTS.template.md` (reescrito — vira `AGENTS.md` para o usuário)

**Novo propósito:** system prompt contextual para qualquer agente trabalhando
*no vault do usuário*. Agnóstico de editor e de ferramenta de IA.

Conteúdo:

1. **Estrutura do vault (PARA)**
   - `00 - Inbox/` — captura rápida, sem curadoria
   - `10 - Projects/` — projetos ativos com resultado definido
   - `20 - Areas/` — responsabilidades contínuas
   - `30 - Resources/` — referências e materiais de apoio
   - `40 - Archive/` — material inativo
   - `99 - Meta & Attachments/` — configuração, guias, imagens

2. **Convenções de notas**
   - Wikilinks: `[[nome da nota]]`
   - Frontmatter YAML para metadados (tags, datas, status)
   - Dataview para consultas dinâmicas
   - Templater para templates de notas recorrentes

3. **Ferramentas que lêem o vault**
   - Obsidian e VS Code com Foam são ambos suportados
   - O agente não assume qual editor está ativo — opera nos arquivos `.md` diretamente

4. **O que o agente pode fazer com segurança**
   - Criar e editar notas Markdown
   - Mover arquivos entre pastas PARA
   - Sugerir e criar wikilinks
   - Consultar estrutura de pastas

5. **O que evitar sem confirmação**
   - Deletar arquivos
   - Modificar configurações do Obsidian (`.obsidian/`)
   - Operações git destrutivas

**O que sai completamente:** CI/CD, GitHub Actions, pnpm, scripts de setup,
template boundary, fronteira do initialize.yml — contexto de desenvolvimento do
template, irrelevante para o usuário do vault.

---

## 5. Docs do Template (não vão para o usuário)

### `docs/compatibilidade-de-ambiente-e-setup.md` (modificado)

Nova seção `## Caminho do Devcontainer`:
- O que `post-create.sh` instala
- O que `post-start.sh` verifica
- Como testar o container localmente durante desenvolvimento do template

---

## Fronteira do `initialize.yml`

Nenhuma mudança necessária — a fronteira do v0.3 já cobre tudo:

| Arquivo | O que acontece |
|---|---|
| `AGENTS.template.md` | Renomeado para `AGENTS.md` (sobrescreve o atual) |
| `.claude/settings.local.json` | Vai para o usuário (não está em `files_to_remove`) |
| `99 - Meta & Attachments/` | Vai para o usuário |
| `.devcontainer/` | Vai para o usuário |
| `docs/` | Removido |

---

## Fora do Escopo — Próximos Specs

### PT-BR Completo
Migração de nomes de pastas (`10 - Projects/` → `10 - Projetos/`, etc.),
arquivos de template e mensagens de scripts para PT-BR, sem acentos nos
nomes de pasta. Spec separado — breaking change para vaults já inicializados,
requer plano de migração e atualização de `validate_onboarding.js` e smoke tests.

### Publicação com Jekyll
Compatibilidade de links wikilink com Jekyll, pipeline de publicação do vault
como site estático. Spec separado — envolve decisões sobre permalinks,
frontmatter conventions e possível plugin de conversão de wikilinks.

### Vault Colaborativo
Git como backbone assíncrono + plugin de sync em tempo real (LiveSync ou Obsidian
Sync) + convenções de papéis (curador, contribuidor, revisor) + scripts de
resolução de conflito para arquivos `.md` + templates de processo coletivo dentro
do PARA. Spec separado — envolve seleção e configuração de ferramentas de sync,
automação de merge hooks e design de workflows de revisão para equipes.

### Assimilação de Conhecimento
Pipeline de ingestão de dados externos para o vault: scraping web com Playwright
(padrão estabelecido em `rcdc5` — `@rcdcp/scraper-playwright`, conversão
HTML→Markdown via TurnDown, normalização de frontmatter, ingestão no PARA via
inbox), suporte a múltiplos canais (Markdown import, scraping interativo, MCP
enrichment). Spec separado — envolve decisões sobre arquitetura do motor de
ingestão, autenticação em fontes protegidas e validação antes de publicar notas.

### Marimo Notebooks
Estruturas básicas de notebooks reativos Python (Marimo) prontos para uso,
curados junto com o vault — para análise de dados, visualizações e processamentos
que complementam o fluxo de conhecimento do jardim digital. Spec separado —
envolve definição de quais notebooks fazem sentido como ponto de partida e
integração com o ambiente Python já configurado pelo `setup_python.sh`.

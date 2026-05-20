# Setup UX e Sandbox para Agentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar visíveis e bem documentados os dois caminhos de setup do vault (devcontainer e local), melhorar robustez do devcontainer com health checks, e preparar o vault como sandbox agnóstico para agentes de IA com automações representadas no Obsidian.

**Architecture:** Documentação em `99 - Meta e Anexos/` sobrevive ao `initialize.yml` e vai para o usuário. Scripts em `scripts/obsidian/` são wrappers que os plugins do Obsidian chamam. O devcontainer ganha `post-start.sh` para health check ao retomar. `AGENTS.template.md` é reescrito como system prompt de PKM, sem conteúdo de desenvolvimento do template. `.claude/settings.json` entrega allowlists pré-configuradas para Claude Code.

**Tech Stack:** Bash, Markdown, JSON, pnpm, Obsidian plugins (Commander, Shell Commands, Templater, Obsidian Git).

**Spec:** `docs/superpowers/specs/2026-05-19-setup-ux-agent-sandbox-design.md`

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `README.template.md` |
| Modificar | `README.md` |
| Modificar | `99 - Meta e Anexos/Preparando seu Computador para o Vault.md` |
| Criar | `99 - Meta e Anexos/Configurando Localmente.md` |
| Criar | `99 - Meta e Anexos/Configurando com Devcontainer.md` |
| Criar | `99 - Meta e Anexos/Usando com Agentes de IA.md` |
| Modificar | `.devcontainer/post-create.sh` |
| Criar | `.devcontainer/post-start.sh` |
| Criar | `.claude/settings.json` |
| Modificar | `.gitignore` |
| Reescrever | `AGENTS.template.md` |
| Criar | `scripts/obsidian/validate.sh` |
| Criar | `scripts/obsidian/lint.sh` |
| Criar | `scripts/obsidian/check.sh` |
| Criar | `99 - Meta e Anexos/config/commander-example.json` |
| Criar | `99 - Meta e Anexos/config/shell-commands-example.json` |
| Criar | `99 - Meta e Anexos/Automacoes no Obsidian.md` |
| Modificar | `docs/compatibilidade-de-ambiente-e-setup.md` |

---

## Task 1: README — Navegação por persona

**Files:**
- Modify: `README.template.md`
- Modify: `README.md`

- [ ] **Step 1.1: Adicionar seção "Como Começar" ao README.template.md**

Abra `README.template.md`. Após a linha `> Template original: ...` e antes de `## Pré-requisitos`, insira:

```markdown
## Como Começar

| Quero... | Caminho |
|---|---|
| Usar só o Obsidian, sem terminal | Instale o Obsidian e abra esta pasta |
| VS Code + scripts locais | [[Configurando Localmente]] |
| Devcontainer (VS Code + Docker) | [[Configurando com Devcontainer]] |
| Usar com agentes de IA | [[Usando com Agentes de IA]] |

Os guias detalhados estão em `99 - Meta e Anexos/`.

```

- [ ] **Step 1.2: Adicionar seção de navegação para contribuidores ao README.md**

Abra `README.md`. Após o badge de release e antes de `## Pré-requisitos`, insira:

```markdown
## Para Contribuidores

| Tarefa | Recurso |
|---|---|
| Setup local (fnm, uv, pnpm) | `docs/compatibilidade-de-ambiente-e-setup.md` |
| Devcontainer do template | `.devcontainer/` |
| Guia de contribuição | `CONTRIBUTING.md` |
| Arquitetura e decisões | `docs/INDEX.md` |

```

- [ ] **Step 1.3: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 1.4: Commit**

```bash
git add README.template.md README.md
git commit -m "docs: add persona navigation to README files"
```

---

## Task 2: Guias de setup — decisor + setup local

**Files:**
- Modify: `99 - Meta e Anexos/Preparando seu Computador para o Vault.md`
- Create: `99 - Meta e Anexos/Configurando Localmente.md`

- [ ] **Step 2.1: Reescrever o início de "Preparando seu Computador para o Vault.md" como decisor**

O arquivo já tem conteúdo valioso (Git, GitHub Desktop, Android, Termux) — mantê-lo. Substituir apenas a seção de introdução (até "## Instalando o Git no Windows") para incluir a tabela de decisão:

Substitua o bloco após o frontmatter até `## Instalando o Git no Windows` (exclusive) por:

```markdown
# Preparando seu Computador para o Vault

Este guia ajuda você a escolher o caminho de setup certo e a configurar
seu computador para operar o vault com Git.

## Qual caminho é pra mim?

| Quero... | Caminho recomendado |
|---|---|
| Usar só o Obsidian, sem terminal | Instale o Obsidian e abra esta pasta |
| VS Code + scripts (fnm, uv) | [[Configurando Localmente]] |
| Devcontainer (VS Code + Docker) | [[Configurando com Devcontainer]] |
| Usar com agentes de IA | [[Usando com Agentes de IA]] |

Qualquer caminho exige Git e uma conta no GitHub, GitLab ou serviço similar.
Continue lendo para instalar o Git e configurar autenticação.

```

Manter todo o conteúdo restante do arquivo (## Instalando o Git no Windows em diante) sem mudanças.

- [ ] **Step 2.2: Criar "Configurando Localmente.md"**

Crie o arquivo `99 - Meta e Anexos/Configurando Localmente.md` com este conteúdo:

```markdown
---
title: Configurando Localmente
aliases:
  - Setup Local
  - Configurando o Ambiente Local
tags:
  - meta/setup
  - meta/devenv
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Configurando com Devcontainer]]"
---
# Configurando Localmente

Setup do ambiente local para usar o vault com VS Code, terminal e scripts
de automação. Funciona no Windows (Git Bash ou WSL), macOS e Linux.

## Ferramentas necessárias

| Ferramenta | Função | Instalar |
|---|---|---|
| fnm | Gerenciar versão do Node.js | Ver abaixo |
| uv | Instalar ferramentas Python | Ver abaixo |
| Python 3 | Necessário para o script de setup | Ver abaixo |
| pnpm | Gerenciar pacotes Node.js (instalado via fnm) | Automático |

## 1. Instalar o fnm (Node Version Manager)

O `fnm` é cross-platform e funciona nativamente no Windows, macOS e Linux.

**Windows:**
```bash
winget install Schniz.fnm
```

**macOS:**
```bash
brew install fnm
```

**Linux / WSL:**
```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Documentação: <https://github.com/Schniz/fnm>

> Se você já tem `nvm` instalado, o script de setup detecta e usa automaticamente
> como fallback. Recomendamos migrar para `fnm` para suporte nativo no Windows.

## 2. Instalar o uv (Gerenciador Python)

**Windows:**
```bash
winget install --id=astral-sh.uv
```

**macOS:**
```bash
brew install uv
```

**Linux / WSL:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Documentação: <https://docs.astral.sh/uv/getting-started/installation/>

> Se você já tem `pipx` instalado, o script de setup usa como fallback automaticamente.

## 3. Instalar o Python 3

**Windows:**
```bash
winget install Python.Python.3
```

**macOS:**
```bash
brew install python
```

**Linux / WSL:**
```bash
sudo apt install python3
```

## 4. Rodar o script de setup

Com as três ferramentas instaladas, rode na raiz do repositório:

```bash
bash scripts/setup.sh
```

O script configura:
- Git (encoding UTF-8, template de commit)
- `git-filter-repo` via `uv` (ferramenta de manutenção do histórico)
- Node.js via `fnm` + `pnpm` via Corepack
- Dependências do projeto (`pnpm install`)

## 5. Verificar o ambiente

```bash
node -v      # deve mostrar v22.x
pnpm --version
uv --version
```

Depois rode a validação completa:

```bash
pnpm run validate
```

Resultado esperado: `Template smoke passed.`

---
Voltar para [[Preparando seu Computador para o Vault]]
```

- [ ] **Step 2.3: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 2.4: Commit**

```bash
git add "99 - Meta e Anexos/Preparando seu Computador para o Vault.md" "99 - Meta e Anexos/Configurando Localmente.md"
git commit -m "docs: add decision table to setup guide, create local setup guide"
```

---

## Task 3: Guia do Devcontainer

**Files:**
- Create: `99 - Meta e Anexos/Configurando com Devcontainer.md`

- [ ] **Step 3.1: Criar "Configurando com Devcontainer.md"**

```markdown
---
title: Configurando com Devcontainer
aliases:
  - Setup Devcontainer
  - Ambiente de Desenvolvimento no Container
tags:
  - meta/setup
  - meta/devcontainer
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Configurando Localmente]]"
---
# Configurando com Devcontainer

O devcontainer é um ambiente de desenvolvimento completo que roda dentro do
VS Code sem precisar instalar Node.js, Python ou outras ferramentas manualmente.
Tudo vem pré-configurado — incluindo extensões, locale PT-BR e dependências do vault.

## Requisitos

- **VS Code** — <https://code.visualstudio.com/>
- **Extensão Dev Containers** — instale no VS Code:
  `ms-vscode-remote.remote-containers`
- **Docker Desktop** — <https://www.docker.com/products/docker-desktop/>
  (ou Docker Engine no Linux)

## O que vem pré-instalado

| Ferramenta | Versão |
|---|---|
| Node.js | 22 (LTS) |
| pnpm | via Corepack |
| uv | última estável |
| Locale | pt_BR.UTF-8 |

**Extensões VS Code instaladas automaticamente:**
- Foam (wikilinks e grafo de notas)
- markdownlint (qualidade do Markdown)
- Prettier (formatação)

## Como abrir

1. Clone o repositório localmente.
2. Abra a pasta no VS Code.
3. Quando aparecer a notificação "Reopen in Container", clique nela.
   (Ou use o comando `Dev Containers: Reopen in Container` na paleta.)
4. Aguarde o Docker baixar a imagem e instalar as dependências.
   Na primeira vez, leva alguns minutos.

## O que esperar durante a instalação

O VS Code mostra o log do container. Você verá:
1. Download da imagem base
2. Instalação do locale pt_BR
3. `pnpm install --frozen-lockfile`
4. Configuração do Git

Ao final, o terminal exibe:

```text
=== Ambiente pronto ===
Node.js : v22.x.x
pnpm    : x.x.x
uv      : uv x.x.x
=======================
```

Essa mensagem confirma que todas as ferramentas estão funcionando.

## Ao retomar o container

Quando você reabre o VS Code depois de fechar, o container verifica
automaticamente se tudo está em ordem:

- Se `node_modules` sumiu: avisa para rodar `pnpm install`
- Se os hooks do Git precisam de reconfiguraçao: roda `setup_git.sh` sozinho
- Imprime `[devcontainer] Container pronto.` quando terminado

## Dicas

- O store do pnpm fica num volume Docker persistente — reinstalações são rápidas.
- Para reconstruir o container do zero: `Dev Containers: Rebuild Container`.
- Para abrir um terminal dentro do container: `Ctrl+`` ` no VS Code.

---
Voltar para [[Preparando seu Computador para o Vault]]
```

- [ ] **Step 3.2: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 3.3: Commit**

```bash
git add "99 - Meta e Anexos/Configurando com Devcontainer.md"
git commit -m "docs: add devcontainer setup guide"
```

---

## Task 4: Guia de Agentes de IA

**Files:**
- Create: `99 - Meta e Anexos/Usando com Agentes de IA.md`

- [ ] **Step 4.1: Criar "Usando com Agentes de IA.md"**

```markdown
---
title: Usando com Agentes de IA
aliases:
  - Agentes de IA no Vault
  - Vault como Sandbox para IA
tags:
  - meta/ia
  - meta/agentes
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Automacoes no Obsidian]]"
---
# Usando com Agentes de IA

Este vault é um bom ambiente para trabalhar com agentes de IA — Claude Code,
Codex CLI, Gemini CLI, ou qualquer agente que leia e escreva arquivos Markdown.

## O vault é a memória do agente

Você não precisa de pastas ocultas ou arquivos de estado externos. O PARA já é
um sistema de memória: use as próprias notas para dar contexto ao agente.

**Padrão recomendado:**

- `00 - Entrada/contexto-ativo.md` — estado atual do trabalho com o agente
  (o que está sendo feito, decisões recentes, próximos passos)
- `10 - Projects/` — projetos onde o agente pode contribuir
- `30 - Resources/` — referências que o agente pode consultar

Ao iniciar uma nova sessão, aponte o agente para `contexto-ativo.md`.
Ao terminar, peça ao agente para atualizar esse arquivo com o que foi feito.

## Configuração para Claude Code

O vault já vem com `.claude/settings.json` que libera as operações mais
comuns sem pedir confirmação:

- Leitura de qualquer arquivo do vault
- Edição de arquivos `.md`
- Execução de `pnpm run *` e `bash scripts/*`

Operações destrutivas (deletar arquivos, git push) continuam pedindo
confirmação. Você pode ajustar as permissões em `.claude/settings.json`.

O arquivo `AGENTS.md` na raiz do repositório é o system prompt do vault —
descreve a estrutura PARA, as convenções de notas e o que o agente pode
fazer com segurança.

## Compatibilidade com outros agentes

O `AGENTS.md` funciona como contexto para qualquer agente:

- **Claude Code / Codex CLI:** lê `AGENTS.md` automaticamente
- **Gemini CLI:** lê `GEMINI.md` (aponta para `AGENTS.md`)
- **Obsidian plugins de IA:** cole o conteúdo de `AGENTS.md` no campo
  de system prompt do plugin

## Dicas de uso

- **Sessões curtas funcionam melhor** — dê uma tarefa clara por sessão
- **Revise antes de commitar** — use `git diff` ou GitHub Desktop para ver
  o que o agente mudou antes de fazer push
- **Use branches** — para mudanças grandes, peça ao agente para trabalhar
  em um branch separado
- **O agente não conhece o futuro** — mantenha o `contexto-ativo.md` atualizado
  para que cada sessão comece com o estado correto

---
Voltar para [[Preparando seu Computador para o Vault]]
```

- [ ] **Step 4.2: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 4.3: Commit**

```bash
git add "99 - Meta e Anexos/Usando com Agentes de IA.md"
git commit -m "docs: add AI agents usage guide"
```

---

## Task 5: Devcontainer — readiness gate e post-start

**Files:**
- Modify: `.devcontainer/post-create.sh`
- Create: `.devcontainer/post-start.sh`

- [ ] **Step 5.1: Adicionar readiness gate ao post-create.sh**

O arquivo atual termina com `bash scripts/setup_git.sh`. Adicione ao final:

```bash

# Readiness gate — confirma que todas as ferramentas estão disponíveis
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "======================="
```

O arquivo completo ficará:

```bash
#!/bin/bash
set -e

# Locale PT-BR — necessário para terminais e caracteres brasileiros
sudo apt-get install -y --no-install-recommends locales
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8

# Node — ativa pnpm via corepack (já disponível no Node 22)
corepack enable
corepack prepare --activate
pnpm install --frozen-lockfile

# Git
bash scripts/setup_git.sh

# Readiness gate — confirma que todas as ferramentas estão disponíveis
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "======================="
```

- [ ] **Step 5.2: Criar post-start.sh**

Crie `.devcontainer/post-start.sh` com este conteúdo:

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

- [ ] **Step 5.3: Tornar post-start.sh executável**

```bash
git add .devcontainer/post-start.sh
git update-index --chmod=+x .devcontainer/post-start.sh
```

- [ ] **Step 5.4: Registrar post-start no devcontainer.json**

Abra `.devcontainer/devcontainer.json`. Adicione a linha `"postStartCommand"` após `"postCreateCommand"`:

```json
"postCreateCommand": "bash .devcontainer/post-create.sh",
"postStartCommand": "bash .devcontainer/post-start.sh",
```

- [ ] **Step 5.5: Verificar smoke**

```bash
pnpm run smoke:template
```

Resultado esperado: `Template smoke passed.`

- [ ] **Step 5.6: Commit**

```bash
git add .devcontainer/post-create.sh .devcontainer/post-start.sh .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): add readiness gate and post-start health check"
```

---

## Task 6: Agent sandbox — .claude/settings.json

**Files:**
- Create: `.claude/settings.json`
- Modify: `.gitignore`

- [ ] **Step 6.1: Criar .claude/settings.json com allowlist mínima**

Crie `.claude/settings.json` com este conteúdo:

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

Este arquivo vai para o usuário via git. Cobre:
- Leitura de qualquer arquivo do vault
- Edição de arquivos `.md`
- Execução de scripts pnpm e bash

Operações destrutivas (delete, git push) continuam pedindo confirmação.

- [ ] **Step 6.2: Adicionar settings.local.json ao .gitignore**

O `settings.local.json` é para overrides locais de desenvolvimento — não deve ser commitado. Adicione ao `.gitignore`:

```
# Claude Code local overrides
.claude/settings.local.json
```

- [ ] **Step 6.3: Verificar que settings.json será commitado**

```bash
git status .claude/
```

Resultado esperado: `.claude/settings.json` aparece como novo arquivo (untracked ou staged).

- [ ] **Step 6.4: Commit**

```bash
git add .claude/settings.json .gitignore
git commit -m "feat(agents): add Claude Code permissions for vault users"
```

---

## Task 7: AGENTS.template.md — reescrita PKM

**Files:**
- Modify (rewrite): `AGENTS.template.md`

O arquivo atual contém um system prompt genérico de PKM/DevOps escrito para
o desenvolvimento do template. Precisa ser reescrito como system prompt para
o *usuário do vault* — sem conteúdo sobre CI, GitHub Actions, pnpm ou scripts.

- [ ] **Step 7.1: Reescrever AGENTS.template.md**

Substitua o conteúdo completo por:

```markdown
Persona: Voce e um assistente especialista em gestao de conhecimento pessoal (PKM)
e produtividade. Seu objetivo e ajudar o usuario a construir, organizar e
desenvolver seu jardim digital — um repositorio pessoal de notas, projetos e
referencias versionado com Git.

Estrutura do vault (PARA):

* 00 - Entrada/: Captura rapida sem curadoria. Toda nota nova entra aqui antes
  de ser processada e movida para o lugar certo.
* 10 - Projects/: Projetos ativos com resultado e prazo definidos. Um projeto
  termina quando o resultado e alcancado.
* 20 - Areas/: Responsabilidades continuas sem data de termino — saude,
  financas, trabalho, estudos, familia.
* 30 - Resources/: Referencias, materiais de apoio, notas de leitura,
  pesquisas, templates reutilizaveis.
* 40 - Archive/: Material inativo — projetos concluidos, areas abandonadas,
  recursos obsoletos. Preservado para consulta futura.
* 99 - Meta e Anexos/: Configuracao do vault, guias de uso, imagens e
  anexos. Nao e para notas de conhecimento — e para metadados do vault.

Convencoes de notas:

* Wikilinks: use [[nome da nota]] para referenciar outras notas. O nome
  deve ser exato (case-sensitive no link, case-insensitive na busca).
* Frontmatter YAML: use para metadados estruturados — tags, status, datas,
  categoria, audience. Fica no topo do arquivo entre linhas ---.
* Dataview: notas com blocos ```dataview``` fazem consultas dinamicas sobre
  o vault. Nao edite esses blocos sem entender a query.
* Templater: templates ficam em 99 - Meta e Anexos/Templates/. Sao
  ativados pelo plugin Templater no Obsidian.

Ferramentas que leem o vault:

* Obsidian (plugin Foam opcional) e VS Code com extensao Foam sao ambos
  suportados. Opere diretamente nos arquivos .md — nao assuma qual editor
  esta ativo.
* Wikilinks e frontmatter YAML sao reconhecidos por ambos os editores.
* Git e usado para versionamento, backup e sincronizacao entre dispositivos.

O que fazer com seguranca:

* Criar e editar notas Markdown.
* Mover arquivos entre as pastas PARA.
* Sugerir e criar wikilinks entre notas relacionadas.
* Ler e consultar a estrutura de pastas e frontmatter das notas.
* Criar templates e notas de projeto a partir de padroes existentes.
* Organizar o inbox — mover notas de 00 - Entrada/ para a pasta PARA correta.

O que evitar sem confirmacao explicita do usuario:

* Deletar arquivos ou pastas.
* Modificar configuracoes em .obsidian/ ou .vscode/.
* Operacoes Git (commit, push, reset, merge).
* Mover ou renomear pastas inteiras da estrutura PARA.
* Alterar frontmatter de notas em massa.

Principios:

* O usuario tem controle total. Sugira mudancas antes de aplica-las.
* Clareza antes de acao: descreva o que vai fazer antes de fazer.
* O vault e do usuario. Organize pelo que faz sentido para ele, nao pelo
  que e mais eficiente para o codigo.
* Preserve o conhecimento: ao mover ou alterar notas, verifique se nao
  ha wikilinks apontando para o local antigo.
```

- [ ] **Step 7.2: Verificar que o arquivo mudou**

```bash
git diff AGENTS.template.md
```

Deve mostrar o conteúdo antigo removido e o novo adicionado.

- [ ] **Step 7.3: Commit**

```bash
git add AGENTS.template.md
git commit -m "feat(agents): rewrite AGENTS.template.md as PKM-focused user system prompt"
```

---

## Task 8: Scripts Obsidian — wrappers para Shell Commands

**Files:**
- Create: `scripts/obsidian/validate.sh`
- Create: `scripts/obsidian/lint.sh`
- Create: `scripts/obsidian/check.sh`

Os scripts navegam para a raiz do repositório antes de rodar, garantindo que
funcionam independente de onde o Obsidian foi aberto.

- [ ] **Step 8.1: Criar scripts/obsidian/validate.sh**

```bash
#!/bin/bash
# Wrapper para o plugin Shell Commands do Obsidian
# Roda pnpm run validate a partir da raiz do repositório
cd "$(git rev-parse --show-toplevel)"
pnpm run validate
```

- [ ] **Step 8.2: Criar scripts/obsidian/lint.sh**

```bash
#!/bin/bash
# Wrapper para o plugin Shell Commands do Obsidian
# Roda pnpm run lint a partir da raiz do repositório
cd "$(git rev-parse --show-toplevel)"
pnpm run lint
```

- [ ] **Step 8.3: Criar scripts/obsidian/check.sh**

```bash
#!/bin/bash
# Wrapper para o plugin Shell Commands do Obsidian
# Verifica saúde do vault (wikilinks, estrutura de onboarding)
cd "$(git rev-parse --show-toplevel)"
node scripts/validate_onboarding.js
```

- [ ] **Step 8.4: Tornar os scripts executáveis**

```bash
git add scripts/obsidian/validate.sh scripts/obsidian/lint.sh scripts/obsidian/check.sh
git update-index --chmod=+x scripts/obsidian/validate.sh
git update-index --chmod=+x scripts/obsidian/lint.sh
git update-index --chmod=+x scripts/obsidian/check.sh
```

- [ ] **Step 8.5: Testar que os scripts têm sintaxe bash válida**

```bash
bash -n scripts/obsidian/validate.sh && echo "validate.sh OK"
bash -n scripts/obsidian/lint.sh && echo "lint.sh OK"
bash -n scripts/obsidian/check.sh && echo "check.sh OK"
```

Resultado esperado: três linhas "OK".

- [ ] **Step 8.6: Verificar smoke**

```bash
pnpm run smoke:template
```

Resultado esperado: `Template smoke passed.`

- [ ] **Step 8.7: Commit**

```bash
git commit -m "feat(obsidian): add shell command wrappers for Obsidian automation"
```

---

## Task 9: Automações no Obsidian — configs de exemplo e guia

**Files:**
- Create: `99 - Meta e Anexos/config/commander-example.json`
- Create: `99 - Meta e Anexos/config/shell-commands-example.json`
- Create: `99 - Meta e Anexos/Automacoes no Obsidian.md`

- [ ] **Step 9.1: Criar commander-example.json**

O Commander plugin (obsidian-commander) adiciona botões customizados à ribbon
e toolbars do Obsidian. Este é um exemplo de configuração — o formato exato
pode variar entre versões do plugin.

Crie `99 - Meta e Anexos/config/commander-example.json`:

```json
{
  "_comment": "Configuração de exemplo para o plugin Commander (obsidian-commander).",
  "_instrucoes": "Instale Commander via Community Plugins. Copie os comandos desejados para .obsidian/plugins/cmdr/data.json após configurar os IDs dos Shell Commands.",
  "_versao_testada": "Commander 0.8.x",
  "hiderightItems": false,
  "commands": {
    "ribbon": [
      {
        "id": "shell-commands:shell-command-0",
        "icon": "checkmark",
        "name": "Validar vault",
        "mode": "any"
      },
      {
        "id": "shell-commands:shell-command-1",
        "icon": "search",
        "name": "Lint",
        "mode": "any"
      },
      {
        "id": "shell-commands:shell-command-2",
        "icon": "heart",
        "name": "Verificar saúde",
        "mode": "any"
      }
    ]
  }
}
```

- [ ] **Step 9.2: Criar shell-commands-example.json**

O Shell Commands plugin (obsidian-shellcommands) executa comandos shell do
Obsidian. Os IDs devem corresponder aos referenciados no commander-example.json.

Crie `99 - Meta e Anexos/config/shell-commands-example.json`:

```json
{
  "_comment": "Configuração de exemplo para o plugin Shell Commands (obsidian-shellcommands).",
  "_instrucoes": "Instale Shell Commands via Community Plugins. Copie para .obsidian/plugins/obsidian-shellcommands/data.json e ajuste {{vault_path}} se necessário.",
  "_versao_testada": "Shell Commands 0.21.x",
  "settings_version": "0.21.0",
  "shell_commands": {
    "0": {
      "id": "0",
      "platform_specific_commands": {
        "default": "bash '{{vault_path}}/scripts/obsidian/validate.sh'"
      },
      "alias": "Validar vault",
      "confirmed_execution": false,
      "output_channels": {
        "stdout": "notification",
        "stderr": "notification"
      }
    },
    "1": {
      "id": "1",
      "platform_specific_commands": {
        "default": "bash '{{vault_path}}/scripts/obsidian/lint.sh'"
      },
      "alias": "Lint",
      "confirmed_execution": false,
      "output_channels": {
        "stdout": "notification",
        "stderr": "notification"
      }
    },
    "2": {
      "id": "2",
      "platform_specific_commands": {
        "default": "bash '{{vault_path}}/scripts/obsidian/check.sh'"
      },
      "alias": "Verificar saúde",
      "confirmed_execution": false,
      "output_channels": {
        "stdout": "notification",
        "stderr": "notification"
      }
    }
  }
}
```

- [ ] **Step 9.3: Criar Automacoes no Obsidian.md**

Crie `99 - Meta e Anexos/Automacoes no Obsidian.md`:

```markdown
---
title: Automacoes no Obsidian
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
# Automacoes no Obsidian

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
```

- [ ] **Step 9.4: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 9.5: Commit**

```bash
git add "99 - Meta e Anexos/config/commander-example.json" \
        "99 - Meta e Anexos/config/shell-commands-example.json" \
        "99 - Meta e Anexos/Automacoes no Obsidian.md"
git commit -m "feat(obsidian): add automation config examples and setup guide"
```

---

## Task 10: Docs do template — seção devcontainer

**Files:**
- Modify: `docs/compatibilidade-de-ambiente-e-setup.md`

- [ ] **Step 10.1: Adicionar seção do devcontainer ao docs de compatibilidade**

O arquivo atual termina com `## Validação Depois do Setup`. Adicione antes dessa seção:

```markdown
## Caminho do Devcontainer

Para contribuidores do vault-seed que desenvolvem usando o devcontainer:

### O que `post-create.sh` instala

Executado uma única vez na criação do container:
1. Locale `pt_BR.UTF-8` (suporte a caracteres brasileiros no terminal)
2. `pnpm install --frozen-lockfile` (dependências do workspace)
3. `bash scripts/setup_git.sh` (Git: encoding UTF-8, template de commit)
4. Readiness gate (imprime versões de Node.js, pnpm e uv)

### O que `post-start.sh` verifica

Executado toda vez que o container é iniciado:
- Presença de `node_modules` — avisa se ausente
- Configuração do Git commit template — reconfigura se ausente
- Imprime `[devcontainer] Container pronto.` ao finalizar

O `post-start.sh` é **informativo** — nunca faz `exit 1`. O objetivo é
dar visibilidade ao estado do ambiente sem travar o início do container.

### Testando o container durante desenvolvimento

Para reconstruir o container do zero:
```
Dev Containers: Rebuild Container
```

Para verificar o ambiente manualmente dentro do container:
```bash
node -v && pnpm --version && uv --version
pnpm run validate
```

```

- [ ] **Step 10.2: Verificar lint**

```bash
pnpm run lint
```

Resultado esperado: sem erros de markdownlint.

- [ ] **Step 10.3: Commit**

```bash
git add docs/compatibilidade-de-ambiente-e-setup.md
git commit -m "docs: add devcontainer section to compatibility guide"
```

---

## Task 11: Validação final

- [ ] **Step 11.1: Rodar validação completa**

```bash
pnpm run validate
```

Resultado esperado: todos os passos passando — lint, testes, onboarding, smoke.

- [ ] **Step 11.2: Rodar testes do CLI**

```bash
pnpm --filter @dgk/cli test
```

Resultado esperado: 7 testes passando.

- [ ] **Step 11.3: Verificar que os novos arquivos existem**

```bash
ls "99 - Meta e Anexos/Configurando Localmente.md"
ls "99 - Meta e Anexos/Configurando com Devcontainer.md"
ls "99 - Meta e Anexos/Usando com Agentes de IA.md"
ls "99 - Meta e Anexos/Automacoes no Obsidian.md"
ls "99 - Meta e Anexos/config/commander-example.json"
ls "99 - Meta e Anexos/config/shell-commands-example.json"
ls .devcontainer/post-start.sh
ls .claude/settings.json
ls scripts/obsidian/validate.sh
```

Resultado esperado: todos os arquivos existem sem erros.

- [ ] **Step 11.4: Verificar git log**

```bash
git log --oneline -12
```

Resultado esperado: os 11 commits deste plan aparecem no topo do histórico.

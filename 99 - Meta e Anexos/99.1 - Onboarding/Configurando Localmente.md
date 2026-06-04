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
updated: 2026-05-21
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
| --- | --- | --- |
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

### Git Bash, WSL ou Linux/macOS

Com as três ferramentas instaladas, rode na raiz do repositório:

```bash
bash scripts/setup.sh
```

O script configura:

- Git (encoding UTF-8, template de commit)
- `git-filter-repo` via `uv` (ferramenta de manutenção do histórico)
- Node.js via `fnm` + `pnpm` via Corepack
- Dependências do projeto (`pnpm install`)

### Windows (PowerShell nativo, sem Git Bash ou WSL)

Se você está no PowerShell puro, execute os passos manualmente:

```powershell
# 1. Ativar a versão correta do Node.js
fnm use --install-if-missing

# 2. Ativar o pnpm via Corepack
corepack enable
corepack prepare --activate

# 3. Instalar dependências
pnpm install --frozen-lockfile

# 4. Configurar o Git
git config core.autocrlf false
git config core.eol lf
git config i18n.commitEncoding utf-8
git config i18n.logOutputEncoding utf-8
```

> O `scripts/setup.sh` usa bash. No Windows sem Git Bash ou WSL, execute
> os passos acima manualmente uma vez. Para instalar o Git Bash (recomendado),
> use `winget install Git.Git` — ele inclui um terminal bash completo.

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

Resultado esperado: todos os checks terminam sem erro. A auditoria editorial
pode mostrar avisos sobre notas curtas ou possíveis promoções de pasta; esses
avisos orientam curadoria futura, mas não bloqueiam quando o comando termina
com sucesso.

---

Voltar para [[Preparando seu Computador para o Vault]]

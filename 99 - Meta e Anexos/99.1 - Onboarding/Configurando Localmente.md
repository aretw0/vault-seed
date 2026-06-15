---
title: Configurando Localmente
aliases:
  - Setup Local
  - Configurando o Ambiente Local
tags:
  - meta/setup
  - meta/devenv
status: draft
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
de automação. Funciona no Windows, macOS e Linux.

## Instalação rápida do dgk

A CLI do vault (`dgk`) é distribuída via npm. Com Node.js 22+ instalado:

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/aretw0/vault-seed/main/install.sh | sh
```

**Windows (PowerShell 7+):**

```powershell
irm https://raw.githubusercontent.com/aretw0/vault-seed/main/install.ps1 | iex
```

Ou diretamente:

```bash
npm install -g @aretw0/dgk-cli
```

Após a instalação, `dgk --version` confirma que está disponível globalmente.
Depois, na raiz do vault: `dgk setup` configura o ambiente.

---

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

## 4. Configurar o ambiente local

Com `dgk` instalado globalmente e as dependências acima disponíveis,
rode na raiz do repositório clonado:

```bash
dgk setup
```

O comando configura:

- Git (encoding UTF-8, template de commit)
- `git-filter-repo` via `uv` (ferramenta de manutenção do histórico)
- Dependências Node.js via `pnpm install` (se ainda não instaladas)

Funciona em Windows (PowerShell ou Git Bash), macOS e Linux — sem dependência de bash.

## 5. Verificar o ambiente

```bash
node -v      # deve mostrar v22.x
pnpm --version
uv --version
```

Depois verifique o vault:

```bash
dgk check
```

Resultado esperado: onboarding, arquitetura de informação e checagem de texto
terminam sem erro. Avisos sobre notas curtas ou promoções de pasta orientam
curadoria futura mas não bloqueiam.

> **Desenvolvedor do template:** use `pnpm run validate` para o pipeline
> completo de CI (testes, lint, smoke de site, etc.).

---

Voltar para [[Preparando seu Computador para o Vault]]

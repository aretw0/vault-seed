# Compatibilidade de Ambiente e Setup

Este documento descreve as ferramentas necessárias para configurar o ambiente de desenvolvimento local e como rodar o setup do repositório.

Se você está configurando um computador para usar o vault no dia a dia, comece
pelo guia de usuário em `99 - Meta & Attachments/Preparando seu Computador para
o Vault.md`. Este documento aqui é a camada técnica para scripts e setup de desenvolvimento.

## Ferramentas Requeridas

O script `scripts/setup.sh` detecta automaticamente as ferramentas disponíveis. As ferramentas recomendadas são:

| Camada | Ferramenta recomendada | Fallback aceito |
|---|---|---|
| Node.js (versão) | `fnm` — cross-platform | `nvm` (Linux/macOS) |
| Node.js (pacotes) | `pnpm` via Corepack | — |
| Python (ferramentas) | `uv` — cross-platform | `pipx` |

## O que o `setup.sh` Faz

O `setup.sh` orquestra as seguintes verificações e configurações:

1.  **Configuração do Git**: Garante que os filtros do Git, template de commit e configurações de encoding UTF-8 estejam ativas (`setup_git.sh`).
2.  **Ambiente Python** (`setup_python.sh`):
    *   Verifica a presença do Python 3.
    *   Instala `git-filter-repo` via `uv tool install` (preferido) ou `pipx` (fallback).
3.  **Ambiente Node.js** (`setup_node.sh`):
    *   Ativa a versão correta do Node.js via `fnm` (preferido) ou `nvm` (fallback).
    *   Habilita o `pnpm` via Corepack.
    *   Instala as dependências do projeto (`pnpm install --frozen-lockfile`) se `node_modules` não existir.

## Instruções para o Usuário

Instale as ferramentas necessárias antes de rodar o setup:

1.  **Instale o `fnm` (Fast Node Manager)**: O `fnm` é cross-platform e funciona nativamente no Windows, macOS e Linux sem precisar do WSL.
    - Windows: `winget install Schniz.fnm`
    - macOS: `brew install fnm`
    - Linux/WSL: `curl -fsSL https://fnm.vercel.app/install | bash`
    - Documentação: https://github.com/Schniz/fnm

    > Usuários com `nvm` existente: o `setup.sh` detecta e usa o `nvm` automaticamente como fallback, mas recomendamos migrar para `fnm` para suporte nativo no Windows.

2.  **Instale o `uv` (gerenciador Python)**: O `uv` é cross-platform e necessário para instalar `git-filter-repo`.
    - Windows: `winget install --id=astral-sh.uv`
    - macOS: `brew install uv`
    - Linux/WSL: `curl -LsSf https://astral.sh/uv/install.sh | sh`
    - Documentação: https://docs.astral.sh/uv/getting-started/installation/

    > Usuários com `pipx` existente: o `setup.sh` usa `pipx` como fallback automaticamente.

3.  **Instale o Python 3**: Verificado pelo script `setup_python.sh` como pré-requisito de runtime.
    - Windows: `winget install Python.Python.3`
    - macOS: `brew install python`
    - Linux/WSL: `sudo apt install python3`


## Como Rodar o Setup

Com as ferramentas instaladas (fnm, uv, Python 3), execute o script de setup:

```bash
bash scripts/setup.sh
```

O script detecta automaticamente as ferramentas disponíveis e configura o ambiente.

## Configuração do Git Credential Manager (GCM) no WSL

Para garantir uma experiência de uso mais fluida com o Git, especialmente ao interagir com repositórios remotos (como o GitHub) e evitar prompts repetitivos de usuário e senha, é altamente recomendável configurar o Git Credential Manager (GCM).

Se você é um usuário de Windows e utiliza o WSL para executar operações Git, é ideal que o Git configurado dentro do seu ambiente WSL utilize o GCM instalado no Windows. Isso permite que as credenciais sejam gerenciadas de forma centralizada e segura pelo GCM do Windows, sem a necessidade de reconfigurar ou armazenar credenciais separadamente no WSL.

Para configurar o Git no seu ambiente WSL para usar o GCM do Windows, execute o seguinte comando no terminal do seu WSL:

```bash
git config --global credential.helper "/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

**Explicação do Comando:**

*   `git config --global`: Configura o Git globalmente para o seu usuário no WSL.
*   `credential.helper`: Define o programa auxiliar que o Git deve usar para armazenar e recuperar credenciais.
*   `"/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe"`: Este é o caminho absoluto para o executável do Git Credential Manager no seu sistema Windows, acessado a partir do WSL. Note o uso de `\` para escapar o espaço em `Program Files` e `\` para escapar o próprio `\` já que temos essas nuances no do Windows, isso garante que o WSL interprete corretamente o caminho.

Após executar este comando, o Git no seu WSL estará configurado para usar o GCM do Windows, proporcionando uma autenticação transparente e segura para suas operações Git.

## Caminho do Devcontainer

Para contribuidores do vault-seed que desenvolvem usando o devcontainer:

### O que `post-create.sh` instala

Executado uma única vez na criação do container:
1. Locale `pt_BR.UTF-8` (suporte a caracteres brasileiros no terminal)
2. `pnpm install --frozen-lockfile` (dependências do workspace)
3. `bash scripts/setup_git.sh` (Git: encoding UTF-8, template de commit)
4. Pi coding agent (`@earendil-works/pi-coding-agent` + `@aretw0/pi-stack`)
5. Readiness gate (imprime versões de Node.js, pnpm, uv e Pi)

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
node -v && pnpm --version && uv --version && pi --version
pnpm run validate
```

## Validação Depois do Setup

Com o ambiente configurado, valide o repositório antes de abrir uma Proposta de Melhoria:

```bash
pnpm run validate
```

Esse comando cobre lint Markdown, testes dos scripts, validação dos wikilinks de onboarding e smoke de segurança do template.

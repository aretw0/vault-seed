#!/bin/bash
# scripts/setup_node.sh
# Configura o ambiente Node.js — fnm preferido (cross-platform), nvm como fallback
set -e

setup_node_version() {
    echo "Configurando ambiente Node.js..."

    if command -v fnm &>/dev/null; then
        echo "fnm encontrado."
        eval "$(fnm env --use-on-cd)"
        fnm use --install-if-missing
        echo "Node.js $(node -v) ativado via fnm."

    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        echo "[AVISO] nvm encontrado. Recomendamos migrar para fnm (cross-platform)."
        echo "Instale fnm:"
        echo "  Windows : winget install Schniz.fnm"
        echo "  macOS   : brew install fnm"
        echo "  Linux   : curl -fsSL https://fnm.vercel.app/install | bash"
        \. "$HOME/.nvm/nvm.sh"
        [ -s "$HOME/.nvm/bash_completion" ] && \. "$HOME/.nvm/bash_completion"
        nvm use --install-if-missing

    else
        echo "[ERRO] Nenhum gerenciador de versão Node encontrado."
        echo "Instale o fnm:"
        echo "  Windows : winget install Schniz.fnm"
        echo "  macOS   : brew install fnm"
        echo "  Linux   : curl -fsSL https://fnm.vercel.app/install | bash"
        exit 1
    fi

    if ! command -v corepack &>/dev/null; then
        echo "[ERRO] corepack não encontrado. O Corepack acompanha versões modernas do Node.js."
        exit 1
    fi
    corepack enable
    corepack prepare --activate

    if ! command -v pnpm &>/dev/null; then
        echo "[ERRO] pnpm não encontrado após ativar o Corepack."
        exit 1
    fi
    echo "pnpm $(pnpm --version) encontrado."

    if [ ! -d "node_modules" ]; then
        echo "Dependências não instaladas. Rodando 'pnpm install'..."
        pnpm install --frozen-lockfile
    else
        echo "Dependências já instaladas."
    fi

    echo "Configuração do ambiente Node.js concluída."
}

setup_node_version

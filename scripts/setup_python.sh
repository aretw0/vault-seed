#!/bin/bash
# scripts/setup_python.sh
# Configura o ambiente Python — uv preferido, pipx como fallback
set -e

setup_python_environment() {
    echo "Configurando ambiente Python..."

    if ! command -v python3 &>/dev/null; then
        echo "[ERRO] Python 3 não encontrado. Instale via https://www.python.org ou seu gerenciador de pacotes."
        exit 1
    fi
    echo "Python $(python3 --version) encontrado."

    if command -v uv &>/dev/null; then
        echo "uv encontrado. Instalando ferramentas via uv tool..."
        uv tool install git-filter-repo
    else
        echo "[AVISO] uv não encontrado. Usando pipx como fallback."
        echo "Recomendamos instalar uv: https://docs.astral.sh/uv/getting-started/installation/"
        if ! command -v pipx &>/dev/null; then
            python3 -m pip install --user pipx
            python3 -m pipx ensurepath
        fi
        pipx install git-filter-repo
    fi

    echo "Configuração do ambiente Python concluída."
}

setup_python_environment

#!/bin/bash
# scripts/setup_python.sh
# Configura o ambiente Python (verifica, instala pipx e git-filter-repo)

set -e

# Função para verificar e configurar o ambiente Python
setup_python_environment() {
    echo "Configurando ambiente Python..."

    # 1. Verifica a instalação do Python
    PYTHON_CMD=""
    if command -v python3 &>/dev/null; then
        PYTHON_CMD="python3"
        PYTHON_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")
        echo "Python 3 encontrado: v$PYTHON_VERSION"
    elif command -v python &>/dev/null; then
        PYTHON_CMD="python"
        PYTHON_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")
        echo "Python encontrado: v$PYTHON_VERSION (usando 'python' em vez de 'python3')"
    else
        echo "[ERRO] Python não encontrado. Por favor, instale o Python 3 para continuar."
        echo "Recomendamos usar o instalador oficial em https://www.python.org/downloads/ ou um gerenciador de pacotes como o Homebrew (macOS) ou Chocolatey (Windows)."
        exit 1
    fi

    # 2. Instalar pipx se não estiver instalado
    if ! command -v pipx &>/dev/null; then
        echo "pipx não encontrado. Instalando pipx..."
        $PYTHON_CMD -m pip install --user pipx
        $PYTHON_CMD -m pipx ensurepath
        echo "pipx instalado."
    else
        echo "pipx já está instalado."
    fi

    # 3. Instalar git-filter-repo via pipx
    # Verifica se pipx está no PATH após ensurepath
    if ! command -v pipx &>/dev/null; then
        echo "[ERRO] pipx não está no PATH. Por favor, adicione o diretório de instalação do pipx ao seu PATH manualmente."
        exit 1
    fi

    if ! pipx list | grep -q "git-filter-repo"; then
        echo "git-filter-repo não encontrado. Instalando git-filter-repo via pipx..."
        pipx install git-filter-repo
        echo "git-filter-repo instalado."
    else
        echo "git-filter-repo já está instalado."
    fi

    echo "Configuração do ambiente Python concluída."
}

setup_python_environment

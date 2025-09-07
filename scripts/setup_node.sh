#!/bin/bash
# scripts/setup_node.sh
# Configura o ambiente Node.js usando nvm e .nvmrc

set -e

NVM_DIR="$HOME/.nvm"
NVM_RC_FILE=".nvmrc"

# Função para carregar o nvm
load_nvm() {
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh" # This loads nvm
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion
        return 0
    else
        echo "[ERRO] nvm não encontrado. Por favor, instale o nvm (Node Version Manager) para gerenciar suas versões do Node.js."
        echo "Instruções de instalação: https://github.com/nvm-sh/nvm#installing-and-updating"
        return 1
    fi
}

# Função para verificar e instalar/usar a versão do Node.js
setup_node_version() {
    echo "Configurando ambiente Node.js..."

    if ! load_nvm; then
        exit 1
    fi

    if [ -f "$NVM_RC_FILE" ]; then
        echo "Tentando usar a versão do Node.js especificada em $NVM_RC_FILE..."
        # nvm use sem argumentos lê o .nvmrc automaticamente
        if ! nvm use; then
            NODE_VERSION_FROM_RC=$(cat "$NVM_RC_FILE" | tr -d '\r\n') # Lê novamente para a mensagem de erro
            echo "Versão $NODE_VERSION_FROM_RC do Node.js não instalada ou falha ao ativar. Instalando..."
            nvm install "$NODE_VERSION_FROM_RC"
            if ! nvm use; then # Tenta usar novamente após a instalação
                echo "[ERRO] Falha ao ativar a versão do Node.js via nvm. Verifique se a versão em .nvmrc está instalada no WSL."
                exit 1
            fi
        fi
        echo "Node.js $(node -v) ativado."
    else
        echo "[AVISO] Arquivo $NVM_RC_FILE não encontrado. Não foi possível configurar a versão específica do Node.js."
        echo "Verificando a instalação geral do Node.js..."
        if ! command -v node &>/dev/null; then
            echo "[ERRO] Node.js não encontrado. Por favor, instale o Node.js ou crie um arquivo .nvmrc."
            exit 1
        fi
        echo "Node.js encontrado (versão padrão)."
    fi

    # Verifica se o npm está disponível
    if ! command -v npm &>/dev/null; then
        echo "[ERRO] npm não encontrado. O npm geralmente é instalado junto com o Node.js."
        exit 1
    fi
    echo "npm encontrado."

    # Verifica se as dependências do projeto estão instaladas
    if [ ! -d "node_modules" ]; then
        echo "Dependências do Node não instaladas. Rodando 'npm install'..."
        npm install
    else
        echo "Dependências do Node já instaladas."
    fi

    echo "Configuração do ambiente Node.js concluída."
}

setup_node_version

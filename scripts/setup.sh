#!/bin/bash
# scripts/setup.sh
# Script principal para orquestrar a configuração do ambiente

set -e

bash scripts/setup_git.sh
bash scripts/setup_hooks.sh
bash scripts/setup_env.sh

# Configura o ambiente Python (verifica, instala pipx e git-filter-repo)
if bash scripts/setup_python.sh; then
  : # Sucesso, continua
else
  echo "[AVISO] Ambiente Python não está pronto. Ferramentas Python não foram configuradas."
  exit 1
fi

# Configura o ambiente Node.js (incluindo nvm, instalação e npm install)
if . scripts/setup_node.sh; then
  # Configuração do Plugin Copilot (opcional)
  # Para ativar, defina a variável de ambiente ENABLE_COPILOT_SETUP como 'true' antes de executar o setup.sh
  if [ "$ENABLE_COPILOT_SETUP" = "true" ]; then
    echo "[INFO] Ativando a configuração do Copilot..."
    bash scripts/setup_copilot.sh
  else
    echo "[INFO] Configuração do Copilot desativada por padrão. Para ativar, defina ENABLE_COPILOT_SETUP=true."
  fi
else
  echo "[AVISO] Ambiente Node.js não está pronto. Scripts que dependem de Node não foram executados."
  exit 1
fi

echo "Setup completo!"

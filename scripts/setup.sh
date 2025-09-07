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
if bash scripts/setup_node.sh; then
  bash scripts/setup_copilot.sh
else
  echo "[AVISO] Ambiente Node.js não está pronto. Scripts que dependem de Node não foram executados."
  exit 1
fi

echo "Setup completo!"

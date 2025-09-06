#!/bin/bash
# scripts/setup.sh
# Script principal para orquestrar a configuração do ambiente

set -e

bash scripts/setup_git.sh
bash scripts/setup_hooks.sh
bash scripts/setup_env.sh

# Checa Node.js e dependências antes de rodar configuração das chaves dos plugins
if bash scripts/check_node.sh; then
  bash scripts/setup_copilot.sh
else
  echo "[AVISO] Ambiente Node.js não está pronto. Scripts que dependem de Node não foram executados."
  exit 1
fi

echo "Setup completo!"

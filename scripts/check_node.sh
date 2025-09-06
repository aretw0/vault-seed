#!/bin/bash
# Verifica se o Node.js e as dependências estão instaladas
set -e
if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não está instalado. Instale o Node.js para rodar scripts de plugins."
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "[ERRO] Dependências do Node não instaladas. Rode 'npm install' antes de executar scripts de plugins."
  exit 1
fi
echo "Node.js e dependências instaladas. Ambiente pronto para scripts de plugins."

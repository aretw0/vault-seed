#!/bin/bash
# scripts/check_secrets_staged.sh
# Verifica se arquivos sensíveis no staging estão com placeholders, não segredos reais

set -e

SENSITIVE_FILE=".obsidian/plugins/copilot/data.json"

if git diff --cached --quiet -- "$SENSITIVE_FILE"; then
  echo "Nenhuma alteração no arquivo sensível no staging."
  exit 0
fi

# Extrai o conteúdo do arquivo no staging
STAGED_CONTENT=$(git show :"$SENSITIVE_FILE")

# Procura por padrões de segredos reais
if echo "$STAGED_CONTENT" | grep -E 'sk-|AIza|ghp_|api_key|token|senha|password'; then
  echo "[ERRO] Segredo real detectado no staging! Corrija antes de commitar."
  exit 1
else
  echo "Arquivo sensível no staging está seguro (apenas placeholders)."
fi

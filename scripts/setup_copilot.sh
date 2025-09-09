#!/bin/bash
# Executa smudge_secrets.js para o arquivo data.json do plugin Copilot do Obsidian
set -e

COPILOT_DATA_JSON=".obsidian/plugins/copilot/data.json"
GITATTRIBUTES_FILE=".gitattributes"
GITATTRIBUTES_ENTRY=".obsidian/plugins/copilot/data.json filter=copilot-secrets diff=copilot-secrets"

# Verifica e adiciona a entrada .gitattributes se não existir
if ! grep -qF "$GITATTRIBUTES_ENTRY" "$GITATTRIBUTES_FILE"; then
  echo "Adicionando entrada para Copilot no .gitattributes..."
  echo "$GITATTRIBUTES_ENTRY" >> "$GITATTRIBUTES_FILE"
else
  echo "Entrada para Copilot já existe no .gitattributes. Nenhuma alteração necessária."
fi

if [ -f "$COPILOT_DATA_JSON" ]; then
	echo "Executando smudge_secrets.js para $COPILOT_DATA_JSON..."
	cat "$COPILOT_DATA_JSON" | node scripts/smudge_secrets.js > "$COPILOT_DATA_JSON.tmp" && mv "$COPILOT_DATA_JSON.tmp" "$COPILOT_DATA_JSON"
	echo "Arquivo $COPILOT_DATA_JSON sobrescrito com segredos preenchidos."
else
	echo "[AVISO] $COPILOT_DATA_JSON não encontrado. Pulei a etapa de smudge."
fi

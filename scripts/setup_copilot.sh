#!/bin/bash
# Executa smudge_secrets.js para o arquivo data.json do plugin Copilot do Obsidian
set -e
COPILOT_DATA_JSON=".obsidian/plugins/copilot/data.json"
if [ -f "$COPILOT_DATA_JSON" ]; then
	echo "Executando smudge_secrets.js para $COPILOT_DATA_JSON..."
	cat "$COPILOT_DATA_JSON" | node scripts/smudge_secrets.js > "$COPILOT_DATA_JSON.tmp" && mv "$COPILOT_DATA_JSON.tmp" "$COPILOT_DATA_JSON"
	echo "Arquivo $COPILOT_DATA_JSON sobrescrito com segredos preenchidos."
else
	echo "[AVISO] $COPILOT_DATA_JSON não encontrado. Pulei a etapa de smudge."
fi

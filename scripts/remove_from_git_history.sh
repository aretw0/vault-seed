#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
Este script foi desativado porque fazia force-push de todas as branches e tags
na mesma execução que reescrevia o histórico.

Fluxo seguro:
  1. crie um manifesto LOCAL em .local/history-cleanup.paths;
  2. rode: bash scripts/history_cleanup_plan.sh .local/history-cleanup.paths;
  3. as pessoas responsáveis revisam backup, dispositivos e janela;
  4. somente então use history_cleanup_apply_local.sh;
  5. verifique o clone reescrito antes de qualquer push coordenado.

Nenhum script deste repositório faz force-push automaticamente.
EOF

exit 64

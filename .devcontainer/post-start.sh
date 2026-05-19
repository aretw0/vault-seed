#!/bin/bash
# Health check ao retomar o container — informativo, nunca bloqueante

if [ ! -d "node_modules" ]; then
  echo "[aviso] node_modules ausente. Execute: pnpm install"
fi

if ! git config commit.template &>/dev/null; then
  echo "[aviso] Git hooks ausentes. Executando setup_git.sh..."
  bash scripts/setup_git.sh || echo "[aviso] setup_git.sh falhou. Verifique manualmente."
fi

echo "[devcontainer] Container pronto."

#!/usr/bin/env bash
# Install the dgk CLI globally via npm.
# Usage: curl -fsSL https://raw.githubusercontent.com/aretw0/vault-seed/main/install.sh | sh
set -euo pipefail

REQUIRED_NODE_MAJOR=22

echo "╭─────────────────────────────╮"
echo "│             dgk             │"
echo "│   digital gardening kit     │"
echo "╰─────────────────────────────╯"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "Erro: Node.js ${REQUIRED_NODE_MAJOR}+ é necessário."
  echo ""
  echo "Instale via fnm (recomendado):"
  echo "  curl -fsSL https://fnm.vercel.app/install | bash"
  echo "  fnm install ${REQUIRED_NODE_MAJOR}"
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "${NODE_MAJOR}" -lt "${REQUIRED_NODE_MAJOR}" ]; then
  echo "Erro: Node.js ${REQUIRED_NODE_MAJOR}+ necessário (encontrado: $(node --version))"
  echo "  fnm install ${REQUIRED_NODE_MAJOR} && fnm use ${REQUIRED_NODE_MAJOR}"
  exit 1
fi

echo "✓ Node.js $(node --version)"

# Install
echo "Instalando @aretw0/dgk-cli..."
npm install -g @aretw0/dgk-cli

# Verify
if ! command -v dgk &>/dev/null; then
  echo ""
  echo "Aviso: dgk instalado mas não encontrado no PATH."
  echo "Adicione o diretório global do npm ao PATH:"
  echo "  export PATH=\"\$(npm prefix -g)/bin:\$PATH\""
  exit 0
fi

echo ""
echo "✓ dgk $(dgk --version) instalado com sucesso."
echo ""
echo "Próximos passos:"
echo "  cd <seu-vault>"
echo "  dgk setup    # configura o ambiente local"
echo "  dgk check    # verifica a saúde do vault"

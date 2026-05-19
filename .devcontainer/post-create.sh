#!/bin/bash
set -e

# Locale PT-BR — necessário para terminais e caracteres brasileiros
sudo apt-get install -y --no-install-recommends locales
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8

# Diretórios de memória para agentes de IA (Claude Code, Codex, Pi)
# Criados aqui para garantir ownership correto quando os volumes estiverem vazios
for dir in \
  /home/vscode/.local/share/pnpm \
  /home/vscode/.claude \
  /home/vscode/.codex \
  /home/vscode/.pi; do
  mkdir -p "$dir"
  sudo chown -R vscode:vscode "$dir"
done

# Node — ativa pnpm via corepack (já disponível no Node 22)
corepack enable
corepack prepare --activate
pnpm install --frozen-lockfile

# Git
bash scripts/setup_git.sh

# vault: entra como dev user a partir de terminais root do Docker Desktop
sudo cp .devcontainer/vault /usr/local/bin/vault
sudo chmod +x /usr/local/bin/vault

# Readiness gate — confirma que todas as ferramentas estão disponíveis
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "======================="

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
  /home/vscode/.npm-global \
  /home/vscode/.npm-global/bin \
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

# Pi coding agent — agente de IA local
pnpm add -g @earendil-works/pi-coding-agent \
  || echo "[aviso] Pi install falhou. Execute: pnpm add -g @earendil-works/pi-coding-agent"
npm install -g @aretw0/pi-stack \
  || echo "[aviso] pi-stack install falhou. Execute: npm install -g @aretw0/pi-stack"
if command -v pi >/dev/null 2>&1; then
  node "$(npm root -g)/@aretw0/pi-stack/install.mjs" \
    || echo "[aviso] pi-stack setup falhou. Execute: node \$(npm root -g)/@aretw0/pi-stack/install.mjs"
fi

# vault: entra como dev user a partir de terminais root do Docker Desktop
sudo cp .devcontainer/vault /usr/local/bin/vault
sudo chmod +x /usr/local/bin/vault

# Readiness gate — confirma que todas as ferramentas estão disponíveis
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "Pi      : $(pi --version 2>/dev/null || echo 'não instalado')"
echo "======================="

#!/bin/bash
set -e

export PNPM_HOME="${PNPM_HOME:-/home/vscode/.local/share/pnpm}"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

repair_owned_dir() {
  local dir="$1"
  mkdir -p "$dir" 2>/dev/null || {
    if command -v sudo >/dev/null 2>&1; then
      sudo mkdir -p "$dir"
    else
      return 0
    fi
  }
  if [ ! -w "$dir" ] && command -v sudo >/dev/null 2>&1; then
    sudo chown -R "$(id -u):$(id -g)" "$dir" || true
  fi
}

ensure_pnpm() {
  local pnpm_home="${PNPM_HOME:-/home/vscode/.local/share/pnpm}"
  repair_owned_dir "$pnpm_home"
  repair_owned_dir "$pnpm_home/bin"

  corepack prepare --activate

  if ! command -v pnpm >/dev/null 2>&1; then
    cat > "$pnpm_home/pnpm" <<'SH'
#!/usr/bin/env bash
exec corepack pnpm "$@"
SH
    chmod +x "$pnpm_home/pnpm"
  fi
}

# Locale PT-BR — necessário para terminais e caracteres brasileiros
sudo apt-get install -y --no-install-recommends locales
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8

# Diretórios de memória para agentes de IA (Claude Code, Codex, Pi)
# Criados aqui para garantir ownership correto quando os volumes estiverem vazios
for dir in \
  /home/vscode/.local \
  /home/vscode/.local/state \
  /home/vscode/.local/share \
  /home/vscode/.local/share/pnpm \
  /home/vscode/.local/share/pnpm/bin \
  /home/vscode/.local/share/pnpm/store \
  /home/vscode/.config \
  /home/vscode/.config/gh \
  /home/vscode/.cache \
  /home/vscode/.npm-global \
  /home/vscode/.npm-global/bin \
  /home/vscode/.claude \
  /home/vscode/.codex \
  /home/vscode/.pi; do
  repair_owned_dir "$dir"
done

# Node — ativa pnpm via corepack (já disponível no Node 22)
ensure_pnpm
pnpm install --frozen-lockfile --config.confirm-modules-purge=false

# Git
bash scripts/setup_git.sh
if command -v gh >/dev/null 2>&1 && gh auth status -h github.com >/dev/null 2>&1; then
  gh auth setup-git >/dev/null 2>&1 || true
fi

# Pi coding agent — agente de IA local
pnpm add -g @earendil-works/pi-coding-agent \
  || echo "[aviso] Pi install falhou. Execute: pnpm add -g @earendil-works/pi-coding-agent"

# vault: entra como dev user a partir de terminais root do Docker Desktop
sudo cp .devcontainer/vault /usr/local/bin/vault
sudo chmod +x /usr/local/bin/vault

# mdt_cli — gerenciador de templates de diagramas Mermaid
cargo install mdt_cli --locked --version 0.7.0 \
  || echo "[aviso] mdt_cli install falhou. Execute: cargo install mdt_cli --locked --version 0.7.0"

# Python deps — Marimo e libs de análise
uv pip install -r requirements.txt \
  || echo "[aviso] instalação Python falhou. Execute: uv pip install -r requirements.txt"

# Readiness gate — confirma que todas as ferramentas estão disponíveis
echo ""
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "marimo  : $(marimo --version 2>/dev/null || echo 'não instalado')"
echo "Pi      : $(pi --version 2>/dev/null || echo 'não instalado')"
echo "======================="

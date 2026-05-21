#!/bin/bash
# Health check ao retomar o container — informativo, nunca bloqueante

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
  repair_owned_dir /home/vscode/.local
  repair_owned_dir /home/vscode/.local/state
  repair_owned_dir /home/vscode/.local/share
  repair_owned_dir "$pnpm_home"
  repair_owned_dir "$pnpm_home/store"
  repair_owned_dir /home/vscode/.config
  repair_owned_dir /home/vscode/.config/gh
  repair_owned_dir /home/vscode/.cache
  repair_owned_dir /home/vscode/.claude
  repair_owned_dir /home/vscode/.codex

  corepack prepare --activate || true

  if ! command -v pnpm >/dev/null 2>&1; then
    cat > "$pnpm_home/pnpm" <<'SH'
#!/usr/bin/env bash
exec corepack pnpm "$@"
SH
    chmod +x "$pnpm_home/pnpm"
  fi
}

ensure_pi() {
  if command -v pi >/dev/null 2>&1; then
    return
  fi

  echo "[aviso] Pi ausente. Tentando instalar @earendil-works/pi-coding-agent..."
  pnpm add -g @earendil-works/pi-coding-agent \
    || echo "[aviso] Pi install falhou. Execute: pnpm add -g @earendil-works/pi-coding-agent"
}

ensure_pnpm
ensure_pi

if ! command -v gh >/dev/null 2>&1; then
  echo "[aviso] GitHub CLI ausente. Rebuild o devcontainer para instalar gh."
elif gh auth status -h github.com >/dev/null 2>&1; then
  gh auth setup-git >/dev/null 2>&1 || true
elif [ -z "${GH_TOKEN:-}" ]; then
  echo "[info] GitHub CLI sem login. Execute: gh auth login"
fi

if [ ! -d "node_modules" ]; then
  echo "[aviso] node_modules ausente. Execute: pnpm install"
fi

if ! git config commit.template &>/dev/null; then
  echo "[aviso] Git hooks ausentes. Executando setup_git.sh..."
  bash scripts/setup_git.sh || echo "[aviso] setup_git.sh falhou. Verifique manualmente."
fi

echo "[devcontainer] Container pronto."

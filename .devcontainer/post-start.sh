#!/bin/bash
# Health check ao retomar o container — informativo, nunca bloqueante

export PNPM_HOME="${PNPM_HOME:-/home/vscode/.local/share/pnpm}"
export PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Repair .git/objects ownership — the container runtime may clone as root, leaving
# some object subdirs as drwxr-xr-x and causing "insufficient permission" on commit.
if [ -d "$ROOT/.git/objects" ]; then
  sudo chown -R "$(id -u):$(id -g)" "$ROOT/.git/objects" 2>/dev/null || true
fi

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
  repair_owned_dir "$pnpm_home/bin"
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

check_agent_sandbox_tools() {
  missing=()

  for tool in bwrap fd gh jq rg shellcheck shfmt tree uv; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing+=("$tool")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "[aviso] Ferramentas de sandbox ausentes: ${missing[*]}"
    echo "[aviso] Rebuild o devcontainer para aplicar Dockerfile/features."
  fi

  if command -v bwrap >/dev/null 2>&1; then
    if ! bwrap --ro-bind / / true >/dev/null 2>&1; then
      echo "[aviso] bubblewrap instalado, mas sem permissão de namespace."
      echo "[aviso] Reabra/rebuild o devcontainer ou habilite unprivileged user namespaces no host."
    fi
  fi
}

ensure_pnpm
check_agent_sandbox_tools
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

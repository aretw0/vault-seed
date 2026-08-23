#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-}"
ack="${2:-}"
mailmap="${3:-}"
expected="REESCREVER_APENAS_LOCALMENTE"

if [[ -z "$manifest" || ! -f "$manifest" || "$ack" != "$expected" ]]; then
  echo "uso: $0 <manifesto-local> $expected [mailmap-local]" >&2
  exit 64
fi
if [[ -n "$mailmap" && ! -f "$mailmap" ]]; then
  echo "mailmap informado mas não encontrado: $mailmap" >&2
  exit 64
fi
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo não encontrado" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree precisa estar limpa" >&2
  exit 2
fi
if git ls-files --error-unmatch -- "$manifest" >/dev/null 2>&1; then
  echo "o manifesto deve ser local e ignorado pelo Git" >&2
  exit 2
fi
if [[ -n "$mailmap" ]] && git ls-files --error-unmatch -- "$mailmap" >/dev/null 2>&1; then
  echo "o mailmap deve ser local e ignorado pelo Git" >&2
  exit 2
fi

repo="$(basename "$root")"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$(dirname "$root")/${repo}-before-history-rewrite-${stamp}.git"
remote="$(git remote get-url origin)"

printf 'Criando backup espelho em %s\n' "$backup"
git clone --mirror "$root" "$backup"

filter_args=(--paths-from-file "$manifest" --invert-paths --force)
if [[ -n "$mailmap" ]]; then
  printf 'Consolidando identidades com %s\n' "$mailmap"
  filter_args+=(--mailmap "$mailmap")
fi
git filter-repo "${filter_args[@]}"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$remote"
else
  git remote add origin "$remote"
fi

failed=0
while IFS= read -r target || [[ -n "$target" ]]; do
  [[ -z "$target" || "$target" == \#* ]] && continue
  if git log --all --format='%H' -- "$target" | grep -q .; then
    echo "ainda encontrado no histórico: $target" >&2
    failed=1
  fi
done < "$manifest"

# Verifica que nenhuma identidade antiga sobreviveu à consolidação.
if [[ -n "$mailmap" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    old_email="$(printf '%s' "$line" | grep -oE '<[^>]+>' | tail -1 | tr -d '<>')"
    [[ -z "$old_email" ]] && continue
    new_email="$(printf '%s' "$line" | grep -oE '<[^>]+>' | head -1 | tr -d '<>')"
    [[ "$old_email" == "$new_email" ]] && continue
    if git log --all --format='%ae%n%ce' | grep -qxF "$old_email"; then
      echo "identidade antiga ainda presente: $old_email" >&2
      failed=1
    fi
  done < "$mailmap"
fi

[[ "$failed" -eq 0 ]] || exit 3

cat <<EOF
Reescrita APENAS LOCAL concluída.
Backup: $backup
Remote restaurado: $remote

Não houve push. Agora:
  1. valide conteúdo, npm test e restauração do backup;
  2. revise o resultado com as pessoas responsáveis pelo vault;
  3. coordene parada de escrita e reclone dos dispositivos;
  4. faça o push manual com --force-with-lease, nunca --force cego.
EOF

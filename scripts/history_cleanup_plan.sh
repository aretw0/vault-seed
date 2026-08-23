#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-}"
if [[ -z "$manifest" || ! -f "$manifest" ]]; then
  echo "uso: $0 <manifesto-local-com-um-caminho-por-linha>" >&2
  exit 64
fi

root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "execute dentro de um repositório Git" >&2
  exit 1
}
cd "$root"

count=0
found=0
printf '%s\n' '# Plano de limpeza de histórico' ''
printf 'Repositório: %s\n' "$root"
printf 'Branch: %s\n' "$(git branch --show-current)"
printf 'HEAD: %s\n\n' "$(git rev-parse --short HEAD)"

while IFS= read -r target || [[ -n "$target" ]]; do
  [[ -z "$target" || "$target" == \#* ]] && continue
  if [[ "$target" = /* || "$target" == *".."* ]]; then
    echo "caminho recusado: $target" >&2
    exit 2
  fi
  count=$((count + 1))
  commits="$(git rev-list --all -- "$target" | wc -l | tr -d ' ')"
  tracked="não"
  if git ls-files --error-unmatch -- "$target" >/dev/null 2>&1; then
    tracked="sim"
    found=$((found + 1))
  elif git ls-files -- "$target/**" | grep -q .; then
    tracked="sim (diretório)"
    found=$((found + 1))
  fi
  printf -- '- `%s`: atual=%s; commits=%s\n' "$target" "$tracked" "$commits"
done < "$manifest"

printf '\nCaminhos: %d; presentes no índice atual: %d\n' "$count" "$found"
printf '%s\n' 'Este comando não alterou arquivos, refs ou remotes.'
printf '%s\n' 'Antes de aplicar: destino seguro verificado, backup offline, janela conjunta e plano de reclone.'

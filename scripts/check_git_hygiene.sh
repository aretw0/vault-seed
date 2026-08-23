#!/usr/bin/env bash
# Higiene do repositório: estado volátil rastreado e peso de blob.
#
# Adotado do coop-vault, um vault gerado a partir deste template. Lá o guard
# nasceu enumerando `*.pdf` com uma lista de hashes, e falhava dos dois lados:
# era cego para a mesma informação em `.jpg` e tratava anexo legítimo como
# incidente. O critério que sobreviveu é PESO, e vale para qualquer extensão.
#
# Este template está limpo em todos os checks abaixo — vaults reais é que
# acumulam. Isto existe para eles.
set -euo pipefail

bad=0

check_tracked() {
  local pattern="$1"
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    printf 'arquivo volátil rastreado: %s\n' "$file" >&2
    bad=1
  done < <(git ls-files "$pattern")
}

check_tracked '.obsidian/graph.json'
check_tracked '.obsidian/workspace*.json'
check_tracked '.obsidian/cache'
check_tracked 'copilot/copilot-conversations/**'

# ── Guard de peso ──────────────────────────────────────────────────────────
# Dois patamares. AVISAR torna peso visível sem nunca atrapalhar; FALHAR existe
# só para o acidente que machuca — arrastar uma pasta de vídeos, colar um dump
# de banco. Ninguém esbarra em 50 MB por engano, e um guard que atrapalha vira
# guard desligado.
#
# Nenhum tipo de arquivo é critério: PDF, imagem e anexo entram normalmente.
# Blobs grandes aceitos conscientemente vão para HEAVY_ALLOWLIST, por caminho
# exato ou prefixo de pasta.
HEAVY_ALLOWLIST=()
HEAVY_WARN_BYTES="${HEAVY_WARN_BYTES:-1000000}"
HEAVY_FAIL_BYTES="${HEAVY_FAIL_BYTES:-52428800}"

while IFS= read -r -d '' file; do
  skip=0
  for allowed in ${HEAVY_ALLOWLIST[@]+"${HEAVY_ALLOWLIST[@]}"}; do
    if [[ "$file" == "$allowed" || "$file" == "$allowed"* ]]; then
      skip=1
      break
    fi
  done
  [[ "$skip" -eq 1 ]] && continue

  bytes="$(git cat-file -s ":$file" 2>/dev/null || echo 0)"
  if [[ "$bytes" -gt "$HEAVY_FAIL_BYTES" ]]; then
    printf 'blob muito grande rastreado: %s (%s bytes, limite %s)\n' \
      "$file" "$bytes" "$HEAVY_FAIL_BYTES" >&2
    printf '  se for intencional, acrescente à HEAVY_ALLOWLIST em %s\n' "$0" >&2
    bad=1
  elif [[ "$bytes" -gt "$HEAVY_WARN_BYTES" ]]; then
    printf 'aviso: blob pesado rastreado: %s (%s bytes)\n' "$file" "$bytes" >&2
  fi
done < <(git ls-files -z)

if [[ "$bad" -ne 0 ]]; then
  exit 1
fi
printf '%s\n' 'git hygiene: ok'

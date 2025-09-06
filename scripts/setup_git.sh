#!/bin/bash
# Configura filtros do Git para segredos
set -e
echo "Configurando filtros do Git..."
git config filter.copilot-secrets.clean "node scripts/clean_secrets.js"
git config filter.copilot-secrets.smudge "node scripts/smudge_secrets.js"

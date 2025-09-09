#!/bin/bash
# Configura filtros do Git para segredos
set -e
echo "Configurando Git..."
echo "  - Configurando filtros 'clean' e 'smudge' para segredos..."
git config filter.copilot-secrets.clean "node scripts/clean_secrets.js"
git config filter.copilot-secrets.smudge "node scripts/smudge_secrets.js"
echo "  - Configurando template de mensagem de commit (.gitmessage)..."
git config commit.template .gitmessage

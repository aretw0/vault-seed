#!/bin/bash
# scripts/setup_git.sh
# Configura filtros do Git
set -e

echo "Configurando Git..."
git config commit.template .gitmessage
# Exibe nomes de arquivo com acentos sem escaping (ex: "Áreas" em vez de "\303\201reas")
git config core.quotepath false
# Encoding consistente em commits e logs
git config i18n.commitEncoding UTF-8
git config i18n.logOutputEncoding UTF-8
echo "Git configurado."

#!/bin/bash
# Configura filtros do Git
set -e
echo "Configurando Git..."
echo "  - Configurando template de mensagem de commit (.gitmessage)..."
git config commit.template .gitmessage

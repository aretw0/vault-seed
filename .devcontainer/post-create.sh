#!/bin/bash
set -e

# Locale PT-BR — necessário para terminais e caracteres brasileiros
sudo apt-get install -y --no-install-recommends locales
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8

# Node — ativa pnpm via corepack (já disponível no Node 22)
corepack enable
corepack prepare --activate
pnpm install --frozen-lockfile

# Git
bash scripts/setup_git.sh

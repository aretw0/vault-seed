#!/bin/bash
# Wrapper para o plugin Shell Commands do Obsidian
# Roda pnpm run validate a partir da raiz do repositório
cd "$(git rev-parse --show-toplevel)"
pnpm run validate

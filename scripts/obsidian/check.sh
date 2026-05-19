#!/bin/bash
# Wrapper para o plugin Shell Commands do Obsidian
# Verifica saúde do vault (wikilinks, estrutura de onboarding)
cd "$(git rev-parse --show-toplevel)"
node scripts/validate_onboarding.js

#!/bin/bash

# Este script reinicia o cofre para um estado limpo para um novo usuário.

echo "🧹 Limpando artefatos do template..."

# 1. Reseta o CHANGELOG.md
echo "🔥 Resetando CHANGELOG.md"
echo "# Changelog" > CHANGELOG.md
echo "" >> CHANGELOG.md
echo "Todas as mudanças notáveis neste projeto serão documentadas neste arquivo." >> CHANGELOG.md

# 2. Reseta o arquivo VERSION
echo "🔥 Resetando VERSION para 0.0.1"
echo "0.0.1" > VERSION

echo "✅ Limpeza completa."

# 3. Commita a limpeza
echo "✍️ Criando commit inicial..."
git add CHANGELOG.md VERSION
# A flag --no-verify é importante para pular qualquer hook de pre-commit
# que possa interferir neste commit inicial e automatizado.
git commit -m "chore: 🎉 Initialized vault from template" --no-verify

echo "🎉 Cofre inicializado com sucesso! Você está pronto para começar."

# 4. Auto-destruição
echo "🗑️ Removendo script de inicialização..."
rm -- "$0"

echo "🚀 Pronto para começar!"

#!/bin/bash
# Fluxo seguro para .env
set -e
ENV_FILE=".env"
ENV_EXAMPLE_FILE=".env.example"
has_key_filled() {
	grep -E '^[A-Z0-9_]+=[^ ]+' "$ENV_FILE" | grep -v '=$' | grep -v '="*"$' | grep -v "#.*" | grep -q .
}
if [ ! -f "$ENV_FILE" ]; then
	if [ -f "$ENV_EXAMPLE_FILE" ]; then
		cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
		echo "Arquivo .env criado a partir do .env.example."
		echo "Por favor, edite o arquivo .env e preencha pelo menos uma chave antes de rodar este script novamente."
		echo "Você pode rodar novamente este script após preencher o .env."
		exit 1
	else
		echo "[AVISO] .env.example não encontrado. Crie manualmente seu arquivo .env."
		exit 1
	fi
fi
if ! has_key_filled; then
	echo "Nenhuma chave foi preenchida no arquivo .env."
	echo "Por favor, edite o arquivo .env e preencha pelo menos uma chave antes de rodar este script novamente."
	exit 1
fi
echo "Chaves encontradas no .env. Prosseguindo..."

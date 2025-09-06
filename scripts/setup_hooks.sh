#!/bin/bash
# Configura hook de pre-commit
set -e
HOOK_PATH=".git/hooks/pre-commit"
EXPECTED_HOOK='#!/bin/bash
scripts/check_secrets_staged.sh || exit 1'
if [ -f "$HOOK_PATH" ]; then
	EXISTING_HOOK=$(cat "$HOOK_PATH")
	if [ "$EXISTING_HOOK" = "$EXPECTED_HOOK" ]; then
		echo "Hook de pre-commit já está configurado corretamente."
		chmod +x "$HOOK_PATH"
	else
		echo "[AVISO] O hook de pre-commit já existe e é diferente do padrão deste vault."
		echo "Revise manualmente se deseja sobrescrever. Para forçar, execute:"
		echo "  echo -e '$EXPECTED_HOOK' > $HOOK_PATH && chmod +x $HOOK_PATH"
	fi
else
	echo -e "$EXPECTED_HOOK" > "$HOOK_PATH"
	chmod +x "$HOOK_PATH"
	echo "Hook de pre-commit criado."
fi
chmod +x scripts/check_secrets_staged.sh || true

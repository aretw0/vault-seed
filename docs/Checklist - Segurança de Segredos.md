# Checklist de Segurança de Segredos ao Clonar o Vault

Ao clonar este repositório, siga os passos abaixo para garantir que os filtros de segredos e automações funcionem corretamente:

## 1. Setup automatizado
Execute no terminal:

```bash
bash scripts/setup.sh
```

Esse comando orquestra todas as etapas de configuração de segurança e ambiente.
O script verifica se o ambiente Node.js está pronto antes de rodar qualquer plugin que dependa dele (ex: Copilot). Caso não esteja, exibe um aviso e pula a configuração desses plugins.

## 2. O que cada script faz
- `setup_git.sh`: Configura filtros do Git para proteger segredos.
- `setup_hooks.sh`: Instala e valida o hook de pre-commit para garantir que segredos não sejam enviados por engano.
- `setup_env.sh`: Garante que o arquivo `.env` existe e está preenchido corretamente antes de seguir.
- `check_node.sh`: Verifica se o Node.js e as dependências estão instaladas antes de rodar scripts de plugins.
- `setup_copilot.sh`: Executa o smudge para preencher segredos no arquivo `data.json` do plugin Copilot do Obsidian (só é executado se o ambiente Node estiver pronto).

## 3. Preencha o arquivo `.env`
Se for a primeira execução, o script irá criar o `.env` a partir do `.env.example` e pedir para você preencher pelo menos uma chave real.
Edite o arquivo `.env` e rode novamente o setup se necessário.

## 4. Testar o Fluxo
- Faça uma alteração em `.obsidian/plugins/copilot/data.json`.
- Adicione ao staging com `git add`.
- Verifique se os placeholders foram aplicados.
- Tente commitar: o hook de pre-commit bloqueará se houver segredos reais.

## 5. Referência Rápida
- Filtros definidos em `.gitattributes` e scripts na pasta `scripts/`.
- Configuração do filtro precisa ser refeita em cada clone.
- O arquivo `.env` é sempre local e ignorado pelo Git.

---
> Para automação, execute o script `setup.sh` após o clone.

## Observação sobre múltiplas execuções do setup

O setup modular foi projetado para ser seguro em múltiplas execuções:
- Os scripts só criam ou sobrescrevem o hook de pre-commit se ele não existir ou já estiver igual ao padrão do vault.
- Se o hook já existir e for diferente, o script apenas avisa e não sobrescreve automaticamente, evitando perda de customizações.
- Caso queira forçar a atualização do hook, basta executar manualmente:

```bash
echo -e '#!/bin/bash\nscripts/check_secrets_staged.sh || exit 1' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

Assim, você pode rodar o setup quantas vezes quiser sem risco de sobrescrever configurações personalizadas do seu ambiente.

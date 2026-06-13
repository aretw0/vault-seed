---
name: vault-admin
description: Administra canais de publicação, outbox e contatos do vault via painel local ou CLI
version: 0.1.0
---

# Vault Admin

Gerencie os canais de publicação, o outbox e os contatos do vault com `dgk serve` ou pelos subcomandos do CLI.

## Painel admin local

```bash
# Inicia o painel em http://localhost:4322
dgk serve

# Porta personalizada
dgk serve --port 8080
```

O painel exibe:
- Status de configuração de cada canal (Mastodon, Bluesky, Telegram, Buttondown)
- Itens do outbox de publicação com status e canais alvo
- Histórico de rate limits por plataforma

O servidor escuta apenas em `127.0.0.1` e não requer autenticação adicional em uso local.

## API REST (quando `dgk serve` está ativo)

| Rota | O que retorna |
|---|---|
| `GET /api/status` | Status de configuração de cada canal |
| `GET /api/outbox` | Itens do outbox de publicação |
| `GET /api/contacts` | Contatos por plataforma com contagem |
| `GET /api/rate-limits` | Histórico de envios e janelas por plataforma |

## Configurar canais via CLI

```bash
# Configurar ou reconfigurar um canal
dgk sow telegram
dgk sow mastodon
dgk sow bluesky
dgk sow buttondown

# Ver status de todos os canais
dgk check
```

## Gerenciar o outbox

```bash
# Regenerar o outbox a partir dos frontmatters do vault
dgk etl

# Publicar no Telegram (dry-run primeiro)
dgk outbox telegram --dry-run
dgk outbox telegram

# Importar mensagens do Telegram para 00 - Entrada/
dgk inbox telegram
```

## Gerenciar contatos

Os contatos de canais (grupos, chats, listas) ficam separados das credenciais:

```bash
# Descobrir e salvar chats do Telegram automaticamente
dgk sow telegram   # executa getUpdates e salva contatos
```

Local de armazenamento configurável em `~/.dgk/silo.json`:
- `"vault"` (padrão) → `dados/lab/contacts/<plataforma>.json` — versionado no vault
- `"local"` → `~/.dgk/contacts/<plataforma>.json` — apenas na máquina

## Fluxo recomendado de operação

1. Configure credenciais com `dgk sow <canal>`
2. Atualize o outbox com `dgk etl`
3. Revise o outbox em `dgk serve` ou em `dados/lab/outbox-publicacao.json`
4. Faça um dry-run do canal alvo: `dgk outbox telegram --dry-run`
5. Publique: `dgk outbox telegram`

## Interpretando o status de configuração

Cada canal retornado por `/api/status` tem um array `keys`:

```json
{
  "id": "telegram",
  "label": "Telegram",
  "keys": [
    { "key": "TELEGRAM_BOT_TOKEN", "configured": true,  "preview": "1234••••••••" },
    { "key": "TELEGRAM_CHAT_ID",   "configured": false, "preview": null }
  ]
}
```

Se alguma chave tiver `configured: false`, o canal não conseguirá publicar até que seja configurado via `dgk sow`.

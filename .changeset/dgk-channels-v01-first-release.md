---
"@aretw0/dgk-channels": minor
---

Primeira publicação: rate limiter e topologia de contatos para pipelines de publicação dgk.

**`@aretw0/dgk-channels/rate-limiter`** — rate limiter orientado a plataforma para pipelines de publicação assíncronos. Respeita limites por burst (N mensagens por janela de tempo) e intervalo mínimo entre envios (`minDelayMs`). Implementado com sleep adaptativo: recalcula o delay restante após cada sleep de burst-window para não violar o intervalo mínimo em condições de concorrência. Configurável por serviço (perfis Telegram, Mastodon, Bluesky, Buttondown incluídos).

**`@aretw0/dgk-channels/contacts`** — descoberta e persistência de contatos de canais de publicação. Para Telegram: chama `getUpdates` para descobrir chats ativos do bot e persiste em `contacts.json` local. `resolveContactsDir` localiza o diretório de contatos a partir do silo de credenciais. Usado por `dgk sow` para popular a lista de destinatários no primeiro setup.

**`@aretw0/dgk-channels`** (entry point) — re-exporta os módulos acima. Consumido por `dgk serve` via import dinâmico (não quebra em vaults que não instalaram o pacote).

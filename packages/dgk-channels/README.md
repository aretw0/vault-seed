# @aretw0/dgk-channels

Primitivas agnósticas de plataforma para os pipelines de publicação do
Digital Gardening Kit: _rate limiting_ e topologia de contatos. Consumido pelo
`dgk serve`/`dgk outbox` via import dinâmico — não quebra em vaults que não
instalaram o pacote.

## Exports

| Subpath                             | Conteúdo                                                                                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@aretw0/dgk-channels/rate-limiter` | `throttle(platform, opts)` respeita burst (N mensagens por janela) e intervalo mínimo entre envios (`minDelayMs`), com sleep adaptativo. `PLATFORM_LIMITS` traz perfis para Telegram, Mastodon, Bluesky e Buttondown. |
| `@aretw0/dgk-channels/contacts`     | Descoberta e persistência de contatos de canal: `resolveContactsDir`, `loadContacts`, `saveContacts` e `discoverAndSaveTelegramContacts` (usa `getUpdates` do Telegram e persiste em `contacts.json`).                |
| `@aretw0/dgk-channels`              | Re-exporta os dois módulos acima.                                                                                                                                                                                     |

## Instalação

```bash
pnpm add @aretw0/dgk-channels
```

## Uso

```js
import { throttle, PLATFORM_LIMITS } from "@aretw0/dgk-channels/rate-limiter";

// aguarda o tempo necessário para respeitar os limites da plataforma
await throttle("telegram", PLATFORM_LIMITS.telegram);
// ... envia a mensagem ...
```

O estado de rate limit é persistido em `~/.dgk/rate-limits.json`
(`DEFAULT_STATE_PATH`).

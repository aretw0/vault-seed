# ROADMAP — @aretw0/dgk-channels

Pacote **bridge temporário** de primitivas de canal para o ecossistema DGK.
Quando o refarm publicar equivalentes, vault-seed migra para consumidor e este
pacote pode ser descontinuado ou reduzido a re-exports.

## v0.1.0 (atual)

| Módulo | Status |
|---|---|
| `rate-limiter` — token bucket por plataforma, estado em `~/.dgk/` | ✓ |
| `contacts` — topologia de canais (vault/local/custom), merge por id | ✓ |
| 28 testes (throttle, burst, handleRateLimitResponse, loadContacts, saveContacts) | ✓ |
| Plataformas cobertas: telegram, mastodon, bluesky, whatsapp, buttondown | ✓ |

## Roadmap de migração

| Primitiva | Bridge atual | Destino futuro |
|---|---|---|
| `throttle`, `PLATFORM_LIMITS` | `src/rate_limiter.js` | `@refarm.dev/rate-limiter` |
| `loadContacts`, `saveContacts` | `src/contacts.js` | `@refarm.dev/contacts` |
| Credenciais (silo) | `packages/cli/src/silo.js` | `@refarm.dev/silo` |

## Publicação

Publicar como `@aretw0/dgk-channels` no npm é opcional enquanto for
apenas consumido internamente no workspace. Avaliar após o refarm definir
sua própria API pública para rate-limiter e contacts.

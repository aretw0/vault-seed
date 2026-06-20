# ROADMAP — @aretw0/dgk-cli

CLI do Digital Gardening Kit. Orquestra Lab, publicação, configuração de canais
e o painel admin local.

## v0.4.0 (em release)

| Item                                                                                          | Status     |
| --------------------------------------------------------------------------------------------- | ---------- |
| `dgk serve` — admin local com API REST e UI de config/sow                                     | ✓          |
| `dgk sow telegram` — descoberta de CHAT_ID via getUpdates                                     | ✓          |
| `dgk outbox telegram` + `dgk inbox telegram`                                                  | ✓          |
| `dgk etl` — pipeline de dados top-level (era `dgk lab etl`)                                   | ✓          |
| `dgk evaluate` — avaliação determinística de escrita (top-level, era `dgk lab evaluate`)      | ✓          |
| 180+ testes (etl, outbox, inbox, frontmatter, lab, silo, sow, serve, obsidian, note, publish) | ✓          |
| Publicar no npm                                                                               | ✓ (v0.2.0) |

## Próximos passos

- `dgk serve`: autenticação por token quando exposto além de 127.0.0.1
- `dgk outbox mastodon`, `dgk outbox bluesky` — paridade com Telegram
- `dgk sow --remove <canal>` como subcomando explícito (hoje só via dashboard)
- Migrar `silo.js` para consumir `@refarm.dev/silo` quando publicado

## Bugs conhecidos

- Setup test tem stdout poluído: `detectObsidian()` imprime durante testes

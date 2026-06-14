# ROADMAP — vault-seed

Template canônico do **Digital Gardening Kit (DGK)**: estrutura PARA, Lab interativo,
pipeline de publicação multi-canal e painel admin local. Superfície de distribuição do
ecossistema DGK — *powered by refarm* no longo prazo.

---

## Milestone atual — v0.4.0

| Entregável | Status |
|---|---|
| `dgk sow` com descoberta automática de CHAT_ID (Telegram) | ✓ |
| `dgk outbox telegram` + `dgk inbox telegram` | ✓ |
| `@aretw0/dgk-channels` (rate-limiter, contacts) — bridge temporário | ✓ |
| `dgk serve` — painel admin local com API REST e UI de config | ✓ |
| `vault-admin` skill (7ª skill em `@aretw0/dgk-skills`) | ✓ |
| 178+ testes automatizados (CLI, dgk-channels, scripts) | ✓ |
| Trilhas de teste manual (canais, outbox, admin) | ✓ |
| Publicar `@aretw0/dgk-cli@0.4.0` no npm | ☐ |
| Publicar `@aretw0/dgk-skills@0.2.0` no npm | ☐ |
| Validação E2E com Telegram real | ☐ |

---

## Próximas fases

### v0.5.0 — IaC de Fontes

- `lab.sources.json` — configuração declarada de fontes de dados (tipo, URL, destino PARA, perfil)
- Interface `ExtractionProfile` — perfis Python modulares por tipo de fonte
- `dgk etl` lê `lab.sources.json` e despacha para o perfil registrado
- Cache bruto (`dados/lab/cache/`) e staging (`dados/lab/staging/`) — reprocessar sem refetch
- Roteamento de taxonomia: campo `"target": "auto"` → classificador IA determina pasta PARA
- `dgk outbox mastodon`, `dgk outbox bluesky` — paridade com Telegram

### v0.6.0 — Convergência Nostr

- Canal `nostr` no outbox (kind 30023 via refarm identity)
- `publicar-thread.py`: célula de publicação Nostr via WebSocket
- `analise-outbox.py`: coluna Nostr na tabela de canais

### v0.7.0 — Primitivas do refarm como dependências

- Migrar `@aretw0/dgk-channels` → consumidor de `@refarm.dev/rate-limiter` e `@refarm.dev/contacts`
- `silo.js` → wrapper fino sobre `@refarm.dev/silo`
- `dgk-skills`: adicionar campo `"refarm"` ao package.json sem reescrever os SKILL.md

---

## Por package

- [`packages/dgk-cli`](packages/dgk-cli/ROADMAP.md) — CLI, comandos, admin server
- [`packages/dgk-channels`](packages/dgk-channels/ROADMAP.md) — rate-limiter, contacts (bridge)
- [`packages/dgk-skills`](packages/dgk-skills/ROADMAP.md) — skills Pi canônicas do DGK

---

## Convergência de ecossistema

| Camada | Projeto | Papel |
|---|---|---|
| Distribuição | vault-seed | Template de vault; superfície de produto |
| Runtime de agentes | agents-lab (Pi) | Execução de skills; cultivador de primitivas agnósticas |
| Protocolo soberano | refarm | Engine canônica futura (Tractor + Nostr + CRDT) |

`dgk-skills` é canônico ao DGK e fica neste repositório. Para agents-lab vai apenas
o que for agnóstico do DGK e útil a qualquer projeto do ecossistema.

---

## Changelog do DGK como conteúdo publicável

O changelog cobre o **DGK como plataforma** — qualquer release do template ou dos
packages. Entradas de blog são um tipo especializado orientado a anúncio editorial.
Esta estrutura é do mantenedor; usuários do vault não recebem `docs/` nem `ROADMAP.md`
(removidos pelo `initialize.yml`).

Fluxo após cada release:

1. `pnpm changeset version` — atualiza `CHANGELOG.md` dos packages (técnico)
2. Criar nota editorial em `20 - Projetos/Releases/vX.Y.Z.md`:
   ```yaml
   status: published
   publicationStatus: ready
   channels: [mastodon, bluesky, telegram]
   type: release          # ou: blog — para posts de anúncio/artigo
   ```
3. Escrever o corpo com contexto humano (o que mudou, impacto para o usuário)
4. `dgk etl` → outbox atualizado
5. `dgk outbox telegram --dry-run` → revisar → `dgk outbox telegram`

---

## Documentação detalhada

- [Arquitetura e ecossistema](docs/ARCHITECTURE.md)
- [Diagrama de camadas](docs/diagrams/ECOSYSTEM.md)
- [Trilha: editores](docs/roteiro-teste-editores.md)
- [Trilha: Lab de notebooks](docs/roteiro-teste-lab.md)
- [Trilha: canais de publicação](docs/roteiro-teste-canais.md)
- [Trilha: ciclo do outbox](docs/roteiro-teste-outbox.md)
- [Trilha: painel admin](docs/roteiro-teste-admin.md)

# Trilha: Ciclo completo do outbox de publicação

> **Quando usar:** antes de publicar notas em canais reais, ao adicionar um novo canal ao fluxo,
> ou como validação pré-release do pipeline ETL → outbox → publish.
>
> **Tempo estimado:** 15–20 min (dry-run incluso).
>
> **Pré-requisito:** ao menos um canal configurado (`dgk sow` ou dashboard).
> Rate limits respeitados — cada plataforma tem espaçamento mínimo entre envios.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `publishToTelegram` respeita `--dry-run` (não envia) | `publish_to_telegram.test.mjs` |
| `publishToTelegram` avança offset de estado após envio | `publish_to_telegram.test.mjs` |
| `publishToTelegram` respeita `--limit N` | `publish_to_telegram.test.mjs` |
| `inboxFromTelegram` salva updates em `00 - Entrada/` | `inbox_from_telegram.test.mjs` |
| `inboxFromTelegram` não processa update já visto (offset) | `inbox_from_telegram.test.mjs` |
| `throttle` dorme o `minDelayMs` entre chamadas imediatas | `rate_limiter.test.js` |
| `throttle` força espera ao atingir `burstLimit` | `rate_limiter.test.js` |
| `handleRateLimitResponse` extrai `retry_after` do Telegram 429 | `rate_limiter.test.js` |
| Outbox JSON tem `schemaVersion`, `items` com `id` únicos | `publication_outbox.test.mjs` |

---

## Etapa 1 — Preparar a nota para publicação

Abrir uma nota no Obsidian ou qualquer editor e ajustar o frontmatter:

```yaml
---
title: "Título da nota"
status: published
publicationStatus: ready
channels:
  - telegram
  - mastodon
audience: todos
---
```

Campos obrigatórios para entrar no outbox:

| Campo | Valor que habilita a nota |
|---|---|
| `status` | `published` |
| `publicationStatus` | `ready` |
| `channels` | lista com ao menos um canal |

---

## Etapa 2 — Rodar o ETL

```bash
dgk etl
```

O ETL executa em sequência:

1. `lab_etl_demo.mjs` — extrai dados do vault
2. `prepare_feed_sources.mjs` — processa fontes de feed
3. `prepare_publication_outbox.mjs` — **lê frontmatters e monta o outbox**
4. `prepare_lab_datasets.mjs` — prepara datasets para notebooks

| # | O que verificar | Esperado |
|---|---|---|
| E1 | Saída sem `Error:` ou stack trace | Pipeline concluído sem falha |
| E2 | Arquivo `dados/lab/outbox-publicacao.json` atualizado | `collectedAt` reflete horário da execução |

**Verificação rápida:**

```bash
node -e "const d=require('./dados/lab/outbox-publicacao.json'); console.log('items:', d.items?.length, '| schema:', d.schemaVersion)"
```

Esperado: `items: N | schema: 1` com N > 0 se há notas com `publicationStatus: ready`.

---

## Etapa 3 — Revisar o outbox

```bash
# Listar notas prontas para publicação
node -e "const d=require('./dados/lab/outbox-publicacao.json'); d.items?.filter(i=>i.publicationStatus==='ready').forEach(i=>console.log(i.channels.join(','), '|', i.title))"
```

Ou usar o dashboard:

```bash
dgk serve   # abre http://localhost:4322
```

A seção "Outbox de publicação" lista título, status, canais e data.

---

## Etapa 4 — Dry-run (obrigatório antes do primeiro envio)

### Telegram

```bash
dgk outbox telegram --dry-run
```

| # | O que verificar | Esperado |
|---|---|---|
| T1 | Saída mostra `[dry-run]` para cada nota | Nenhum envio real; Telegram API não é chamada |
| T2 | Notas listadas batem com o outbox revisado | Mesmas notas, mesmos canais |
| T3 | `--limit 1` processa só a primeira nota | `[dry-run] 1/1 ...` |

```bash
dgk outbox telegram --dry-run --limit 1
```

---

## Etapa 5 — Publicação real

> Só executar após dry-run confirmado. A publicação é irreversível no canal.

```bash
dgk outbox telegram
```

| # | O que verificar | Esperado |
|---|---|---|
| P1 | Mensagem aparece no canal/chat do Telegram | Texto formatado com título e excerpt |
| P2 | Segunda execução imediata não republica | Estado de offset atualizado; `0 notas para publicar` |
| P3 | Rate limiter em ação (envio múltiplo) | Pausa visível entre mensagens (`~1s` para Telegram) |

**Verificar estado após publicação:**

```bash
cat dados/lab/.outbox-state.json   # ou ~/.dgk/outbox-state.json conforme config
```

O offset deve ter avançado. Notas já publicadas não reaparecem.

---

## Etapa 6 — Inbox Telegram (opcional)

```bash
dgk inbox telegram --dry-run
```

| # | O que verificar | Esperado |
|---|---|---|
| I1 | Lista updates recebidos sem criar arquivos | `[dry-run]` antes de cada item |
| I2 | Execução sem `--dry-run` | Arquivos `.md` criados em `00 - Entrada/Telegram/` |
| I3 | Segunda execução | Mensagens já processadas não duplicadas |

---

## Etapa 7 — Rate limits (verificação de saúde)

```bash
cat ~/.dgk/rate-limits.json
```

Verificar que:

- [ ] Cada plataforma tem `lastSentAt` recente.
- [ ] `sentInWindow` não está próximo do `burstLimit` (20 para Telegram por janela de 60s).
- [ ] Arquivo tem permissão de leitura para o usuário corrente.

No dashboard (`dgk serve`), a seção "Rate limits" mostra o último envio e o contador da janela.

---

## Smoke check rápido pós-publicação

| Check | Comando | Esperado |
|---|---|---|
| Outbox gerado | `node -e "require('./dados/lab/outbox-publicacao.json')"` | Sem erro de parse |
| Estado do outbox | `cat dados/lab/.outbox-state.json` | JSON válido com offset |
| Rate limits | `cat ~/.dgk/rate-limits.json` | JSON válido por plataforma |

---

## Como reportar falhas

Criar issue com:
- Plataforma e versão do Node.
- Saída completa do comando que falhou.
- Conteúdo de `dados/lab/outbox-publicacao.json` (item que falhou).
- Conteúdo de `~/.dgk/rate-limits.json`.
- Se foi dry-run ou publicação real.

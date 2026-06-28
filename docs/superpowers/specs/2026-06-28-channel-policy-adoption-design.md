# Design — 2ª adoção do refarm: `@refarm.dev/channel-policy-v1` no outbox

> Status: design aprovado (2026-06-28). Segunda adoção do programa de ocamento
> (ver `2026-06-27-refarm-adoption-launch-process-design.md`). Detalha a adoção
> do contrato `channel-policy-v1` no pipeline de publicação, pronta pra virar
> plano.

## Contexto e objetivo

`@refarm.dev/channel-policy-v1` é um **pacote de contrato puro** (provider-neutral):
constantes (`CHANNEL_DELIVERY_ENVELOPE_SCHEMA`, review states, delivery statuses),
tipos (`ChannelDeliveryEnvelope`/`ChannelDeliveryItem`/`ChannelDeliveryReceipt`/
`ChannelDryRunResult`/`ChannelDestinationRef`/`ChannelContentHash`/review/rate-limit)
e 3 funções: `buildChannelIdempotencyKey`, `validateChannelDeliveryEnvelope`,
`isChannelDeliveryEnvelope`. Não chama provider, não formata, não persiste —
downstream é dono dos adapters/cópia/UX/comandos.

Hoje o vault-seed **reimplementa ad-hoc** o que esse contrato define: o
`publish_to_telegram.mjs` usa idempotência caseira (`sha(path).slice(0,12)` +
estado `.dgk/outbox-telegram.json`), content-hash (sha256), rate-limit
(`@aretw0/dgk-channels/rate-limiter`), dry-run e resultado `{sent}`. Ocar =
substituir esses conceitos pelo contrato compartilhado, padronizando a evidência
de entrega pra todos os canais futuros (mastodon/bluesky/…).

**Tier 1:** o produtor (`scripts/prepare_publication_outbox.mjs`) e o sender
(`scripts/publish_to_telegram.mjs`) são scripts da **raiz** (não bibliotecas
publicadas). Logo, `@refarm.dev/channel-policy-v1` entra como `file:` no
`package.json` raiz **sem publish-hold** (`minimumReleaseAgeExclude` já isenta
`@refarm.dev/*`).

## Decisões (aprovadas)

1. **Restructure como superset.** O payload do outbox (`.dgk/outbox-publicacao.json`)
   passa a ser um `ChannelDeliveryEnvelope` **válido** mantendo os campos atuais.
   O validador é **não-estrito** (checa `schema`/`createdAt`/`producer`/`deliveries`
   + dryRuns/receipts opcionais; ignora campos extras) — então `items`, `channels`,
   `policy`, `kind`, `itemCount`, `sha256` etc. permanecem (admin do `serve.js` e o
   `publication_outbox.test` atuais seguem funcionando).
2. **Destino lógico sem segredo.** O produtor roda sem segredos (`noSecrets`), então
   não conhece endereços concretos (chat IDs). Cada `destination` é uma ref lógica
   (`{id:"<channelId>:default", channelId, providerId, address:"<channelId>:default"}`);
   o **sender** resolve o endereço concreto do silo no envio. O endereço concreto
   nunca entra no artefato.
3. **`review` mapeado do risco do canal.** `risk !== "baixo"` (social-adapter/alto)
   → `{required:true, state:"pending"}`; `baixo` (canonical/syndication) →
   `{required:false, state:"not-required"}`.
4. **Receipts no estado do telegram.** O sender grava `ChannelDeliveryReceipt` na
   forma do contrato; idempotência passa a usar `delivery.idempotencyKey`.

## Componentes

### Produtor — `scripts/prepare_publication_outbox.mjs`

- Importa de `@refarm.dev/channel-policy-v1`: `CHANNEL_DELIVERY_ENVELOPE_SCHEMA`,
  `buildChannelIdempotencyKey`, `validateChannelDeliveryEnvelope`.
- Para cada `item × channelId` em `item.channels`, monta um `ChannelDeliveryItem`:
  - `id`: `` `${item.id}::${channelId}` `` (único, sem colisão).
  - `channelId`, `providerId`: o id do canal.
  - `destination`: `{ id: `${channelId}:default`, channelId, providerId, address: `${channelId}:default` }`.
  - `idempotencyKey`: `buildChannelIdempotencyKey({ channelId, destinationId: `${channelId}:default`, contentHash })`.
  - `contentHash`: `{ algorithm: "sha256", value: item.sha256 }`.
  - `createdAt`: `generatedAt`.
  - `review`: por risco do canal (decisão 3) — olhar o catálogo `CHANNELS` pelo id.
  - `labels`: `[`item:${item.id}`]`.
- Payload (superset): campos atuais **+** `schema: CHANNEL_DELIVERY_ENVELOPE_SCHEMA`,
  `createdAt: generatedAt`, `producer: "vault-seed:dgk-outbox"`, `deliveries`.
- **Gate:** `const v = validateChannelDeliveryEnvelope(payload); if (!v.ok) throw new Error(...issues)`
  antes de escrever. `sha256` recalculado sobre o superset.
- Exporta `buildPublicationOutbox` com a mesma assinatura (consumidores não mudam).

### Sender — `scripts/publish_to_telegram.mjs`

- Lê o envelope; `deliveries.filter(d => d.channelId === "telegram")`. Junta cada
  delivery ao `item` por `item.id` (determinístico: `delivery.id.split("::")[0]`,
  já que `item.id` é slug sem `::`) para o conteúdo (`formatMessage` segue igual).
- Idempotência: chave de estado = `delivery.idempotencyKey` (substitui
  `sha(path).slice(0,12)`).
- No envio, monta `ChannelDeliveryReceipt` `{ itemId: delivery.id, status, observedAt,
  providerMessageId?, error? }` (`status`: `"sent"` ok; `"rate-limited"` no 429;
  `"failed"` em erro) e persiste em `.dgk/outbox-telegram.json` (agora `receipts`
  na forma do contrato, além do índice de idempotência). Rate-limit segue via
  `@aretw0/dgk-channels/rate-limiter`.
- Dry-run: imprime como hoje; receipt opcional com `status:"dry-run"` (YAGNI: só se
  trivial).

### Consumo / deps

- `package.json` (raiz): `"@refarm.dev/channel-policy-v1": "file:vendor/refarm.dev-channel-policy-v1-0.1.0.tgz"`.
  Vendorizar o tarball do handoff `2026-06-26`.
- **Sem publish-hold** (Tier 1). `serve.js`: **sem mudança** (`items` preservado).

## Verificação

- Novo `scripts/refarm_channel_policy_consumer_contract.test.mjs`: trava o `file:`
  dep + a superfície consumida (`CHANNEL_DELIVERY_ENVELOPE_SCHEMA`,
  `buildChannelIdempotencyKey`, `validateChannelDeliveryEnvelope`,
  `isChannelDeliveryEnvelope` no `dist/index.d.ts`).
- Estende `scripts/publication_outbox.test.mjs`: assertions atuais permanecem +
  `validateChannelDeliveryEnvelope(data).ok === true`, `data.schema`/`data.producer`,
  `data.deliveries` (uma por item×canal; `idempotencyKey` não-vazio;
  `contentHash.value === item.sha256`; `review` conforme o risco do canal).
- Atualiza `scripts/publish_to_telegram.test.mjs`: idempotência por
  `delivery.idempotencyKey`; receipts na forma do contrato.
- `pnpm test` ≥356 + novos, verde.
- Smoke manual: `pnpm run notebooks:etl` (gera o outbox) → `validateChannelDeliveryEnvelope`
  ok no artefato real; `dgk` telegram `--dry-run` lê deliveries sem erro.
- Admin (`dgk serve`) renderiza o outbox como antes (items intactos).

## Loop de feedback pro refarm

Registrar em `docs/convergencia-refarm-feedback.md` qualquer defeito/lacuna do
`channel-policy-v1` que surgir no consumo (ex.: tipo faltando pro nosso caso,
validador rígido demais/de menos, idempotency-key insuficiente). Avaliar se o
contrato cobriu nosso pipeline sem reimplementação residual.

## Riscos e itens deferidos

- **Outros canais** (mastodon/bluesky/…) só geram deliveries no envelope; os senders
  concretos deles **não** existem ainda — fora de escopo (YAGNI). O envelope só os
  declara; nenhum envio é implementado além do telegram.
- **Receipts no admin** (`serve.js` surfacing de status de entrega) — incremento
  futuro; não nesta fatia.
- **`dryRuns` no envelope** — opcional; só se o dry-run do telegram justificar.
- **Migrar o índice de idempotência legado**: o estado `.dgk/outbox-telegram.json`
  muda de chave (`sha` → `idempotencyKey`). Reenvio único de itens já enviados é
  aceitável (ou tratar no plano com migração de chave). Decidir no plano.

## Critérios de sucesso

1. `.dgk/outbox-publicacao.json` é um `ChannelDeliveryEnvelope` válido (superset)
   com `deliveries` por item×canal; idempotency/contentHash/review do contrato.
2. `publish_to_telegram` usa `delivery.idempotencyKey` e grava receipts do contrato;
   sem idempotência/recibo caseiros.
3. Admin/site/teste atuais intactos; suíte verde + contrato de consumidor.
4. Sem publish-hold (Tier 1); feedback do `channel-policy-v1` registrado.

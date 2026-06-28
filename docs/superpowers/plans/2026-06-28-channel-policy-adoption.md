# Adoção do `@refarm.dev/channel-policy-v1` no outbox — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o outbox de publicação para ser um `ChannelDeliveryEnvelope` (superset) do `@refarm.dev/channel-policy-v1`, com o produtor emitindo `deliveries` (idempotencyKey/contentHash/review do contrato) e o telegram sender consumindo deliveries + gravando receipts — substituindo a idempotência/recibo caseiros.

**Architecture:** O produtor (`scripts/prepare_publication_outbox.mjs`, raiz/Tier 1) adiciona ao payload os campos do envelope (`schema`/`createdAt`/`producer`/`deliveries`) mantendo os campos atuais (`items`/`channels`/`policy`/`kind`), e valida via `validateChannelDeliveryEnvelope` (não-estrito → superset OK). O sender (`scripts/publish_to_telegram.mjs`, raiz/Tier 1) passa a iterar `deliveries` (filtradas por `channelId==="telegram"`), usar `delivery.idempotencyKey` como chave de estado e gravar `ChannelDeliveryReceipt`. Consumo via `file:` no `package.json` raiz, sem publish-hold.

**Tech Stack:** Node ≥22 (ESM), `node:test`, `@refarm.dev/channel-policy-v1@0.1.0` (tarball do handoff `2026-06-26`), `glob`, `gray-matter`, `@aretw0/dgk-channels/rate-limiter`.

## Global Constraints

- `@refarm.dev/channel-policy-v1` via `file:vendor/refarm.dev-channel-policy-v1-0.1.0.tgz` no **`package.json` raiz** (vendor/ gitignored; tarball do handoff `refarm/.refarm/handoff/vault-seed/2026-06-26/`). NÃO commitar o tarball.
- `@refarm.dev/*` já isento da supply-chain via `minimumReleaseAgeExclude` (não mexer).
- **Tier 1 / sem publish-hold**: NÃO adicionar a dep ao `package.template.json`; o root não é publicado como lib.
- Superset: o payload mantém `items` (com `.channels`), `channels`, `policy`, `kind`, `itemCount`, `sha256` — `serve.js` e `publication_outbox.test` atuais não podem quebrar.
- `producer: "vault-seed:dgk-outbox"`; `schema: "refarm.channel-delivery-envelope.v1"` (= `CHANNEL_DELIVERY_ENVELOPE_SCHEMA`).
- Destino lógico sem segredo: `address = "<channelId>:default"`.
- `review` por risco: `risk==="baixo"` → `{required:false, state:"not-required"}`; senão `{required:true, state:"pending"}`. Canais fora do catálogo `CHANNELS` (ex.: `telegram`) → default risco `"médio"` (→ required).
- O sender **NÃO enforça** o review gate nesta fatia (carrega no envelope; envio preservado).
- Testes via `node --test`; suíte alvo ≥356 + novos, verde.
- Achados do `channel-policy-v1` → `docs/convergencia-refarm-feedback.md`.

---

## File Structure

- `vendor/refarm.dev-channel-policy-v1-0.1.0.tgz` — tarball vendorizado (gitignored).
- `package.json` — +dep `file:` channel-policy-v1; +3 testes no script `test`.
- `scripts/prepare_publication_outbox.mjs` — produtor emite envelope superset + deliveries + validate gate.
- `scripts/publish_to_telegram.mjs` — sender consome deliveries + receipts + idempotencyKey.
- `scripts/refarm_channel_policy_consumer_contract.test.mjs` — contrato de consumidor (novo).
- `scripts/publication_outbox.test.mjs` — estendido (envelope + deliveries).
- `scripts/publish_to_telegram.test.mjs` — fixtures viram envelopes; idempotência por delivery.
- `docs/convergencia-refarm-feedback.md` — nota de cobertura.

---

### Task 1: Vendorizar channel-policy-v1 + fixar dep + contrato de consumidor

**Files:**
- Create: `vendor/refarm.dev-channel-policy-v1-0.1.0.tgz` (cópia do handoff, NÃO commitar)
- Modify: `package.json`
- Test: `scripts/refarm_channel_policy_consumer_contract.test.mjs`

**Interfaces:**
- Produces: a dep `@refarm.dev/channel-policy-v1` resolvível na raiz; superfície `{ CHANNEL_DELIVERY_ENVELOPE_SCHEMA, buildChannelIdempotencyKey, validateChannelDeliveryEnvelope, isChannelDeliveryEnvelope }`.

- [ ] **Step 1: Write the failing contract test**

Create `scripts/refarm_channel_policy_consumer_contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("the root pins @refarm.dev/channel-policy-v1 via the local tarball", () => {
  const pkg = readJson("package.json");
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(
    deps["@refarm.dev/channel-policy-v1"],
    "file:vendor/refarm.dev-channel-policy-v1-0.1.0.tgz",
  );
});

test("the consumed @refarm.dev/channel-policy-v1 surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "node_modules/@refarm.dev/channel-policy-v1/dist/index.d.ts"),
    "utf8",
  );
  for (const name of [
    "CHANNEL_DELIVERY_ENVELOPE_SCHEMA",
    "buildChannelIdempotencyKey",
    "validateChannelDeliveryEnvelope",
    "isChannelDeliveryEnvelope",
  ]) {
    assert.match(dts, new RegExp(`export declare (const|function) ${name}\\b`), `missing ${name}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/refarm_channel_policy_consumer_contract.test.mjs`
Expected: FAIL (dep não fixada; `.d.ts` inexistente em node_modules).

- [ ] **Step 3: Vendorizar o tarball e fixar a dep**

```bash
cp "../../refarm/.refarm/handoff/vault-seed/2026-06-26/refarm.dev-channel-policy-v1-0.1.0.tgz" \
   vendor/refarm.dev-channel-policy-v1-0.1.0.tgz
```
(o repo `refarm` é irmão do `greenhouse`, então `../../refarm` a partir da raiz do vault-seed; ajuste se necessário.)

No `package.json` raiz, adicionar em `dependencies`:
```json
"@refarm.dev/channel-policy-v1": "file:vendor/refarm.dev-channel-policy-v1-0.1.0.tgz"
```

- [ ] **Step 4: Instalar**

Run: `pnpm install`
Expected: instala sem erro de supply-chain (`@refarm.dev/*` isento). Dep nova → sem o gotcha de cache-por-path do store.

- [ ] **Step 5: Registrar o teste no `package.json`** (adicionar `scripts/refarm_channel_policy_consumer_contract.test.mjs` à lista do script `test`, junto dos demais `scripts/*.test.mjs`).

- [ ] **Step 6: Run to verify it passes**

Run: `node --test scripts/refarm_channel_policy_consumer_contract.test.mjs`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit (sem o tarball — gitignored)**

```bash
git add package.json pnpm-lock.yaml scripts/refarm_channel_policy_consumer_contract.test.mjs
git commit -m "feat(deps): vendor @refarm.dev/channel-policy-v1 + consumer contract"
```

---

### Task 2: Produtor emite o envelope superset + `deliveries` + gate de validação

**Files:**
- Modify: `scripts/prepare_publication_outbox.mjs`
- Test: `scripts/publication_outbox.test.mjs`

**Interfaces:**
- Consumes: `CHANNEL_DELIVERY_ENVELOPE_SCHEMA`, `buildChannelIdempotencyKey`, `validateChannelDeliveryEnvelope` (Task 1).
- Produces: o payload de `buildPublicationOutbox({...})` agora inclui `schema`, `createdAt`, `producer`, `deliveries` (array de `ChannelDeliveryItem`), além dos campos atuais. Cada delivery: `{ id: "<itemId>::<channelId>", channelId, providerId, destination, idempotencyKey, contentHash:{algorithm:"sha256",value:item.sha256}, createdAt, review, labels }`.

- [ ] **Step 1: Write the failing test (envelope + deliveries)**

Em `scripts/publication_outbox.test.mjs`, adicionar o import no topo:
```js
import { validateChannelDeliveryEnvelope } from "@refarm.dev/channel-policy-v1";
```
E, ao final do test existente (após a linha `assert.deepEqual(data.items[0].tags, []);`, antes do fechamento `});`), adicionar:
```js
  // Envelope superset (channel-policy-v1): mantém os campos atuais e é válido.
  assert.equal(data.schema, "refarm.channel-delivery-envelope.v1");
  assert.equal(data.producer, "vault-seed:dgk-outbox");
  assert.equal(validateChannelDeliveryEnvelope(data).ok, true);

  // Uma delivery por item×canal (o item declara mastodon + rss).
  assert.equal(data.deliveries.length, 2);
  const mastodon = data.deliveries.find((d) => d.channelId === "mastodon");
  const rss = data.deliveries.find((d) => d.channelId === "rss");
  assert.equal(mastodon.id, `${data.items[0].id}::mastodon`);
  assert.equal(mastodon.contentHash.value, data.items[0].sha256);
  assert.ok(mastodon.idempotencyKey.length > 0);
  // mastodon = risco "médio" → review obrigatória; rss = "baixo" → não obrigatória.
  assert.deepEqual(mastodon.review, { required: true, state: "pending" });
  assert.deepEqual(rss.review, { required: false, state: "not-required" });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/publication_outbox.test.mjs`
Expected: FAIL (`data.schema`/`data.deliveries` undefined).

- [ ] **Step 3: Importar o contrato e adicionar os helpers**

Em `scripts/prepare_publication_outbox.mjs`, adicionar ao bloco de imports do topo:
```js
import {
  CHANNEL_DELIVERY_ENVELOPE_SCHEMA,
  buildChannelIdempotencyKey,
  validateChannelDeliveryEnvelope,
} from "@refarm.dev/channel-policy-v1";
```

Adicionar, em nível de módulo (após a const `CHANNELS`):
```js
function riskForChannel(channelId) {
  const channel = CHANNELS.find((c) => c.id === channelId);
  return channel ? channel.risk : "médio";
}

function reviewGateForRisk(risk) {
  return risk === "baixo"
    ? { required: false, state: "not-required" }
    : { required: true, state: "pending" };
}
```

- [ ] **Step 4: Construir `deliveries` e os campos do envelope**

Em `buildPublicationOutbox`, logo após o `const items = ... .sort(...)` (antes de `const payloadWithoutHash`), adicionar:
```js
  const deliveries = items.flatMap((item) =>
    item.channels.map((channelId) => {
      const destinationId = `${channelId}:default`;
      const contentHash = { algorithm: "sha256", value: item.sha256 };
      return {
        id: `${item.id}::${channelId}`,
        channelId,
        providerId: channelId,
        destination: { id: destinationId, channelId, providerId: channelId, address: destinationId },
        idempotencyKey: buildChannelIdempotencyKey({ channelId, destinationId, contentHash }),
        contentHash,
        createdAt: generatedAt,
        review: reviewGateForRisk(riskForChannel(channelId)),
        labels: [`item:${item.id}`],
      };
    }),
  );
```

Modificar `payloadWithoutHash` para incluir os campos do envelope no topo e `deliveries`:
```js
  const payloadWithoutHash = {
    schema: CHANNEL_DELIVERY_ENVELOPE_SCHEMA,
    createdAt: generatedAt,
    producer: "vault-seed:dgk-outbox",
    schemaVersion: 1,
    kind: "publication-outbox",
    source: "markdown-frontmatter:outbox|publicationStatus|channels",
    collectedAt: generatedAt,
    license: "derived-from-vault-notes",
    privacy: "review-before-publish",
    policy: {
      canonicalFirst: true,
      dryRunFirst: true,
      humanReviewRequired: true,
      noSecrets: true,
    },
    channels: CHANNELS,
    deliveries,
    itemCount: items.length,
    items,
  };
```

- [ ] **Step 5: Adicionar o gate de validação antes de escrever**

Em `buildPublicationOutbox`, entre `const payload = { ...payloadWithoutHash, sha256: ... };` e `mkdirSync(...)`, adicionar:
```js
  const envelopeCheck = validateChannelDeliveryEnvelope(payload);
  if (!envelopeCheck.ok) {
    throw new Error(
      `publication outbox is not a valid channel-delivery envelope: ${JSON.stringify(envelopeCheck.issues)}`,
    );
  }
```

- [ ] **Step 6: Run to verify it passes**

Run: `node --test scripts/publication_outbox.test.mjs`
Expected: PASS (assertions atuais + as novas).

- [ ] **Step 7: Commit**

```bash
git add scripts/prepare_publication_outbox.mjs scripts/publication_outbox.test.mjs
git commit -m "feat(outbox): emit channel-policy delivery envelope (superset) with deliveries"
```

---

### Task 3: Telegram sender consome `deliveries` + grava receipts

**Files:**
- Modify: `scripts/publish_to_telegram.mjs`
- Test: `scripts/publish_to_telegram.test.mjs`

**Interfaces:**
- Consumes: o envelope da Task 2 (`outbox.deliveries` + `outbox.items`).
- Produces: `publishToTelegram(...)` mantém o retorno `{ sent, skipped }`; o estado em `statePath` passa a indexar por `delivery.idempotencyKey` e a acumular `receipts` (`ChannelDeliveryReceipt`).

- [ ] **Step 1: Atualizar as fixtures do teste para envelopes**

Em `scripts/publish_to_telegram.test.mjs`, substituir o helper `makeOutbox` por um construtor de envelope (com `items` + `deliveries`), e dar `id`/`sha256` às notas:
```js
function delivery(note, channelId) {
  const destinationId = `${channelId}:default`;
  return {
    id: `${note.id}::${channelId}`,
    channelId,
    providerId: channelId,
    destination: { id: destinationId, channelId, providerId: channelId, address: destinationId },
    idempotencyKey: `channel-delivery:${channelId}:${destinationId}:sha256:${note.sha256}`,
    contentHash: { algorithm: "sha256", value: note.sha256 },
    createdAt: "2026-05-26T00:00:00.000Z",
    review: { required: false, state: "not-required" },
    labels: [`item:${note.id}`],
  };
}

function makeOutbox(items) {
  const withIds = items.map((it, i) => ({
    id: it.id ?? `item-${i}`,
    sha256: it.sha256 ?? `hash-${i}`,
    ...it,
  }));
  const deliveries = withIds.flatMap((it) => (it.channels ?? []).map((ch) => delivery(it, ch)));
  return JSON.stringify({
    schema: "refarm.channel-delivery-envelope.v1",
    createdAt: "2026-05-26T00:00:00.000Z",
    producer: "vault-seed:dgk-outbox",
    schemaVersion: 1,
    deliveries,
    items: withIds,
  });
}
```
(Os testes que chamam `makeOutbox([...])` continuam válidos — o helper agora deriva `id`/`sha256`/`deliveries`.)

- [ ] **Step 2: Run to verify the sender tests now fail**

Run: `node --test scripts/publish_to_telegram.test.mjs`
Expected: FAIL — o sender ainda filtra `outbox.items` por `channels`, mas a idempotência/estado e o caminho de envio precisam usar `deliveries` (os testes de envio/`skipped`/não-reenvio quebram com o novo formato até o Step 3).

- [ ] **Step 3: Migrar o sender para consumir `deliveries`**

Em `scripts/publish_to_telegram.mjs`, substituir o bloco que monta `notes`/`pending`/`batch` e o loop de envio. Trocar:
```js
  const outbox = JSON.parse(readFileSync(outboxPath, "utf8"));
  const notes = (outbox.notes || outbox.items || []).filter((n) => {
    const channels = n.channels || n.outboxChannels || [];
    return channels.includes("telegram");
  });

  if (!notes.length) {
    console.log("publish_to_telegram: nenhuma nota com channel=telegram no outbox.");
    return { sent: 0, skipped: 0 };
  }

  const state = existsSync(statePath)
    ? (() => { try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return { sent: {} }; } })()
    : { sent: {} };

  const pending = force
    ? notes
    : notes.filter((n) => !state.sent[sha(n.path || n.title || "")]);
  const batch = pending.slice(0, limit);
```
por:
```js
  const outbox = JSON.parse(readFileSync(outboxPath, "utf8"));
  const itemById = new Map((outbox.items || outbox.notes || []).map((it) => [it.id, it]));
  const deliveries = (outbox.deliveries || []).filter((d) => d.channelId === "telegram");

  if (!deliveries.length) {
    console.log("publish_to_telegram: nenhuma delivery com channelId=telegram no envelope.");
    return { sent: 0, skipped: 0 };
  }

  const state = existsSync(statePath)
    ? (() => { try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return { sent: {}, receipts: [] }; } })()
    : { sent: {}, receipts: [] };
  if (!state.sent) state.sent = {};
  if (!state.receipts) state.receipts = [];

  const pending = force
    ? deliveries
    : deliveries.filter((d) => !state.sent[d.idempotencyKey]);
  const batch = pending.slice(0, limit);
```

Substituir o loop `for (const note of batch) { ... }` inteiro por:
```js
  let sentCount = 0;
  for (const delivery of batch) {
    const note = itemById.get(delivery.id.split("::")[0]) ?? {};
    const key = delivery.idempotencyKey;
    const text = formatMessage(note);
    const observedAt = () => new Date().toISOString();

    if (dryRun) {
      console.log(`\n[dry-run] → chat ${chatId}\n${text}\n`);
      state.receipts.push({ itemId: delivery.id, status: "dry-run", observedAt: observedAt() });
    } else {
      await throttle("telegram", { statePath: rateLimiterStatePath });
      try {
        const result = await sendMessage(token, chatId, text, httpPost);
        const retryAfter = handleRateLimitResponse(result, "telegram");
        if (retryAfter) {
          console.warn(`  [429] aguardando ${retryAfter / 1000}s antes de retentar...`);
          state.receipts.push({ itemId: delivery.id, status: "rate-limited", observedAt: observedAt(), retryAfterSeconds: Math.round(retryAfter / 1000) });
          await new Promise((r) => setTimeout(r, retryAfter));
          const retry = await sendMessage(token, chatId, text, httpPost);
          if (!retry.ok) {
            console.error(`  erro após retry: ${retry.description}`);
            state.receipts.push({ itemId: delivery.id, status: "failed", observedAt: observedAt(), error: String(retry.description ?? "retry failed") });
            continue;
          }
        } else if (!result.ok) {
          console.error(`  erro: ${result.description}`);
          state.receipts.push({ itemId: delivery.id, status: "failed", observedAt: observedAt(), error: String(result.description ?? "send failed") });
          continue;
        }
        console.log(`  ✓ enviado: ${note.title || delivery.id}`);
        state.receipts.push({ itemId: delivery.id, status: "sent", observedAt: observedAt(), ...(result.result?.message_id ? { providerMessageId: String(result.result.message_id) } : {}) });
      } catch (err) {
        console.error(`  erro ao enviar ${delivery.id}: ${err.message}`);
        state.receipts.push({ itemId: delivery.id, status: "failed", observedAt: observedAt(), error: err.message });
        continue;
      }
    }

    state.sent[key] = { itemId: delivery.id, sentAt: observedAt() };
    sentCount++;
  }
```

O `sha()` helper fica órfão — removê-lo (a função `sha` no topo do arquivo) já que a idempotência agora vem do contrato.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/publish_to_telegram.test.mjs`
Expected: PASS (envio/skipped/não-reenvio/dry-run/erro/limit, agora sobre deliveries).

- [ ] **Step 5: Commit**

```bash
git add scripts/publish_to_telegram.mjs scripts/publish_to_telegram.test.mjs
git commit -m "feat(outbox): telegram sender consumes channel-policy deliveries + receipts"
```

---

### Task 4: Nota de cobertura no ledger + gate de validação final

**Files:**
- Modify: `docs/convergencia-refarm-feedback.md`

**Interfaces:**
- Consumes: o consumo das Tasks 1–3.

- [ ] **Step 1: Registrar a cobertura do channel-policy-v1**

Em `docs/convergencia-refarm-feedback.md`, na seção "Avaliação de cobertura", adicionar:
```markdown
- `channel-policy-v1@0.1.0` — cobriu o envelope de entrega do outbox (deliveries
  item×canal, idempotencyKey, contentHash, review gate) e os receipts do telegram
  sem reimplementação residual; validador não-estrito permitiu o superset. ✓
```
Se algum defeito/lacuna tiver surgido durante as Tasks 1–3 (ex.: tipo faltando, validador rígido/frouxo demais), registrar na tabela apropriada com status `aberto`.

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS (≥356 + novos).

- [ ] **Step 3: Smoke do artefato real**

Run: `pnpm run notebooks:etl`
Então verificar o envelope real (`channel-policy-v1` é ESM-only → `import()` dinâmico, não `require`):
```bash
node -e "const d=require('./.dgk/outbox-publicacao.json');import('@refarm.dev/channel-policy-v1').then(({validateChannelDeliveryEnvelope})=>{const r=validateChannelDeliveryEnvelope(d);console.log('valid:',r.ok,'deliveries:',d.deliveries.length);if(!r.ok)console.log(JSON.stringify(r.issues));});"
```
Expected: `valid: true` (com N deliveries conforme as notas do vault). Se 0 itens no vault, o envelope tem `deliveries: []` e ainda é válido.

- [ ] **Step 4: Commit**

```bash
git add docs/convergencia-refarm-feedback.md
git commit -m "docs(convergencia): record channel-policy-v1 consumer coverage"
```

---

## Verificação final (gate de validação)

- [ ] `pnpm test` ≥356 + novos (consumer contract + envelope + sender), verde.
- [ ] `validateChannelDeliveryEnvelope(.dgk/outbox-publicacao.json).ok === true` no artefato real.
- [ ] Admin (`dgk serve`) renderiza o outbox como antes (`items` intactos) — checagem visual/manual quando possível.
- [ ] `grep -rnE "sha\(n\.path|state\.sent\[sha" scripts/publish_to_telegram.mjs` → vazio (idempotência caseira removida).
- [ ] Sem `@refarm.dev/channel-policy-v1` no `package.template.json` (Tier 1).
- [ ] Postura mantida: nada publicado; acumula na `develop`.

## Notas / itens deferidos

- **Enforcement do review gate** no sender (pular `review.state==="pending"`): deferido —
  hoje bloquearia o telegram (default médio). Carregado no envelope; enforçar quando
  houver fluxo de aprovação.
- **Migração do índice de idempotência legado** (`sha` → `idempotencyKey`): o estado
  `.dgk/outbox-telegram.json` muda de chave; itens já enviados podem reenviar **uma vez**
  (aceitável). Sem código de migração.
- **Senders de outros canais** (mastodon/bluesky/…): o envelope declara as deliveries,
  mas nenhum envio novo é implementado além do telegram (YAGNI).
- **Receipts no admin** (`serve.js`): incremento futuro.

# Convergência refarm — status do programa (START HERE)

> **Ponto de entrada** pra retomar o programa de ocamento (consumir refarm como SDK, vault-seed como
> camada de produto fina) **sem depender de contexto fora do repo**. As decisões vivem nos
> `convergencia-*.md`; este doc é só o estado + o que vem a seguir. Atualize ao avançar.

## Como o vault-seed consome o refarm (resumo)

vault-seed importa primitivas `@refarm.dev/*` internamente e mantém só o produto (labels, comandos
`dgk`, PARA, profiles, vocab, views). Antes de o refarm publicar, consome via tarball `file:` do
handoff. **Toda a mecânica e os guards estão na doutrina:**
[`convergencia-refarm-logistica.md`](./convergencia-refarm-logistica.md).

## Blocos já consumidos (feito)

| Bloco | Pra quê | Onde |
|---|---|---|
| `@refarm.dev/ds` + `/ds/html` | tokens do Lab + admin do `dgk serve` | `convergencia-ds-lab.md`, `convergencia-homestead-admin.md` |
| `@refarm.dev/process-handoff` | spawn em `dgk-runner`/cli | — |
| `@refarm.dev/channel-policy-v1` | envelope/receipts do outbox (telegram) | — |
| `@refarm.dev/silo` | credenciais (`silo.js`) — em chegada, forward-safe | `convergencia-refarm-feedback.md` |
| `@refarm.dev/enrichment-contract-v1` | enriquecimento de records (ETL) | **vendorizado + contract-test ✓**; adoção (usar no ETL) pendente |
| `@refarm.dev/records-contract-v1` | modelo de records (view + ETL) | **vendorizado + contract-test ✓**; adoção (emitir/ler) pendente |
| `@refarm.dev/source-web` (+ transitivo `source-contract-v1` via override) | aquisição/snapshot de fonte web (fixture sanitizada) → ETL | **vendorizado + contract-test ✓**; adoção (usar no ETL/reference vault) pendente |

## Blocos a chegar do refarm

(vazio — os blocos de T3 estão assimilados; o de T2 abaixo é capability refarm/POC.)

### T2 (jornada soberana) — refarm pronto, consumo vault-seed condicional
`credentials:v1` (VC/wallet) **implementado no refarm**: `@refarm.dev/identity-heartwood` (assinatura
Ed25519 real) + `@refarm.dev/credentials-contract-v1`, na ordem signing-primeiro. É capability
**refarm/POC** — o vault-seed só vendoriza se a UX do headspace precisar emitir/apresentar VC direto;
senão fica do lado refarm/POC. O T2 do vault-seed é majoritariamente UX/telas (produto).

## Trabalho pendente no vault-seed (quando os blocos pousarem)

Por bloco, seguir a doutrina (`-logistica`): **vendorizar `file:` → consumer-contract test → adoção
atrás de seam de produto (degradação graciosa)**.

Assimilação (vendorização + contract-test):
- [x] `enrichment:v1` — `scripts/refarm_enrichment_consumer_contract.test.mjs`
- [x] `records:v1` — `scripts/refarm_records_consumer_contract.test.mjs`
- [x] `source-web` (+ `source-contract-v1` via override) — `scripts/refarm_source_web_consumer_contract.test.mjs`
- [ ] `credentials:v1` (depois do heartwood-signing)

Adoção / produto (design já escrito em `docs/superpowers/specs/`):
- [ ] **records ETL profiles** — `2026-06-30-records-etl-profiles-design.md`
- [ ] **records view** (genérica, requisitos = um `@type`; não one-off) — `2026-06-30-records-view-design.md`
- [x] **reference vault** (prova de composição = acceptance gate) — `validations/records-reference/`
  (gap ledger vazio: `source-web`→`records:v1`→`enrichment:v1` compõem ponta a ponta)
- [ ] (candidato) **guard de não-reimplementação** — ver `-logistica`

## Próxima ação concreta

Os 3 blocos de T3 estão **assimilados** e a **reference vault** (acceptance gate) **passou com gap
ledger vazio** — os seams compõem ponta a ponta. O próximo é construir as superfícies de produto
sobre essa base provada: **records ETL profiles** (real, sobre os scripts existentes) e a **records
view** (genérica, no `.site`). A POC então é a reference vault com as 3 fixtures trocadas por adapters
reais. `credentials:v1` (T2) entra após o heartwood-signing no refarm.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

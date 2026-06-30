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

| Capability | Pra quê no vault-seed | Status no refarm |
|---|---|---|
| `credentials:v1` | VC / carteira de dados (jornada soberana) | spec pronto; **pré-req: assinatura real (heartwood) primeiro**; pacote ainda não criado |

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
- [ ] **reference vault** (prova de composição = acceptance gate; **depende dos 4 blocos acima**) —
  `2026-06-30-records-composition-proof-design.md`
- [ ] (candidato) **guard de não-reimplementação** — ver `-logistica`

## Próxima ação concreta

Os 3 blocos de T3 (`enrichment:v1`, `records:v1`, `source-web`) estão **assimilados** (vendorizados +
contract-test). O próximo é **adoção**: construir o primeiro consumidor real — a **reference vault**
(prova de composição, `2026-06-30-records-composition-proof-design.md`), que usa `source-web` (fixture)
→ `records:v1` → `enrichment:v1` e valida os seams ponta a ponta. Depois os **ETL profiles** e a
**records view**. `credentials:v1` (T2) entra após o heartwood-signing no refarm.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

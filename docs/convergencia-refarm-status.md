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

## Blocos a chegar do refarm (specs prontos lá; pacotes em implementação)

Specs escritos no refarm (capabilities genéricas). Quando o pacote + handoff existirem, assimilar
pela doutrina.

| Capability | Pra quê no vault-seed | Status no refarm |
|---|---|---|
| `source-web` (+ transitivo `source-contract-v1`) | aquisição/snapshot de fonte web autenticada → ETL | **implementado** (v0.1.0); falta vendorizar com o transitivo |
| `credentials:v1` | VC / carteira de dados (jornada soberana) | spec pronto; **pré-req: assinatura real (heartwood) primeiro**; pacote ainda não criado |

## Trabalho pendente no vault-seed (quando os blocos pousarem)

Por bloco, seguir a doutrina (`-logistica`): **vendorizar `file:` → consumer-contract test → adoção
atrás de seam de produto (degradação graciosa)**.

Assimilação (vendorização + contract-test):
- [x] `enrichment:v1` — `scripts/refarm_enrichment_consumer_contract.test.mjs`
- [x] `records:v1` — `scripts/refarm_records_consumer_contract.test.mjs`
- [ ] `source-web` (+ vendorizar `source-contract-v1` junto)
- [ ] `credentials:v1` (depois do heartwood-signing)

Adoção / produto (design já escrito em `docs/superpowers/specs/`):
- [ ] **records ETL profiles** — `2026-06-30-records-etl-profiles-design.md`
- [ ] **records view** (genérica, requisitos = um `@type`; não one-off) — `2026-06-30-records-view-design.md`
- [ ] **reference vault** (prova de composição = acceptance gate; **depende dos 4 blocos acima**) —
  `2026-06-30-records-composition-proof-design.md`
- [ ] (candidato) **guard de não-reimplementação** — ver `-logistica`

## Próxima ação concreta

`enrichment:v1` e `records:v1` já assimilados (vendorizados + contract-test). Próximo: **vendorizar
`source-web` junto com seu transitivo `source-contract-v1`** (empacotar ambos do refarm, `overrides:`
no `pnpm-workspace.yaml` se necessário) + contract-test. Em paralelo, **adotar** os dois já
consumidos construindo o primeiro consumidor — a **reference vault** (prova de composição) ou os
**ETL profiles** — que é onde os blocos passam a ser usados de fato. `credentials:v1` depois do
heartwood-signing.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

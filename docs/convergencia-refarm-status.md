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

## Blocos a chegar do refarm (specs prontos lá; pacotes em implementação)

Specs escritos no refarm (capabilities genéricas). Quando o pacote + handoff existirem, assimilar
pela doutrina.

| Capability | Pra quê no vault-seed | Status no refarm |
|---|---|---|
| `source:v1` + `source-web` | aquisição/snapshot de fonte (web autenticada) → ETL | contrato + git/local existem; adapter web em design |
| `records:v1` | modelo de records do grafo (a view e o ETL emitem/leem) | spec pronto; pacote em implementação |
| `enrichment:v1` | enriquecer records por chave externa | spec pronto; pacote em implementação |
| `credentials:v1` | VC / carteira de dados (jornada soberana) | spec pronto; **pré-req: assinatura real (heartwood) primeiro** |

## Trabalho pendente no vault-seed (quando os blocos pousarem)

Por bloco, seguir a doutrina (`-logistica`): **vendorizar `file:` → consumer-contract test → adoção
atrás de seam de produto (degradação graciosa)**.

Específicos do produto (design já escrito em `docs/superpowers/specs/`):
- [ ] **records ETL profiles** — `2026-06-30-records-etl-profiles-design.md`
- [ ] **records view** (genérica, requisitos = um `@type`; não one-off) — `2026-06-30-records-view-design.md`
- [ ] **reference vault** (prova de composição = acceptance gate; **depende dos 4 blocos acima**) —
  `2026-06-30-records-composition-proof-design.md`
- [ ] (candidato) **guard de não-reimplementação** — ver `-logistica`

## Próxima ação concreta

Aguardar o handoff dos pacotes refarm (provável ordem: `enrichment:v1` e `records:v1` primeiro — são
os menores/sem browser). Ao chegar o primeiro, **vendorizar via `file:` + escrever seu
`scripts/refarm_<pkg>_consumer_contract.test.mjs`** (padrão dos existentes). Depois encadear os
demais e montar a reference vault.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

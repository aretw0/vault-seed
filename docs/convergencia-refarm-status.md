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
- [x] **records ETL profile runner** — `scripts/records_etl.mjs` (source snapshot → `records:v1` →
  `enrichment:v1`, degradação graciosa) + teste
- [x] **records view — camada de dados** — `scripts/generate_records_data.mjs` (notas PARA →
  `records:v1`: folder→`@type`, frontmatter→fields, links→relations; convergência) + teste
- [ ] **records view — página astro** (`.site/pages/records/*`) — lê o manifest; não-testável sem
  build, e a IA/colunas são decisão de produto
- [ ] **records ETL real** — profile com fonte/transform reais (decisão de produto: quais notas/vocab)
- [x] **reference vault** (prova de composição = acceptance gate) — `validations/records-reference/`
  (gap ledger vazio: `source-web`→`records:v1`→`enrichment:v1` compõem ponta a ponta)
- [x] **yaml codec (`records-contract-v1/yaml`)** — re-vendorizado + consumido em
  `scripts/refarm_records_consumer_contract.test.mjs` (round-trip: projeção `noteToRecord` →
  `recordToYamlLdObject` → `recordFromYamlLdObject`, + bridge record↔frontmatter). **2º-consumer proof
  fechado.** (Atrito de vendoring: tgz `file:` mesmo nome+versão não re-extrai — precisou integrity nova
  + reinstall limpo; sinalizado ao refarm.)
- [x] **grafo do Explore via `records:v1`** — `.site/lib/vault-explore.ts` (`buildExploreGraph` →
  `buildRecordsGraph` sobre `vault.config.json`, fonte única config-driven; o `.site` e as superfícies
  de records não divergem) + teste TS `vault-explore.graph.test.ts`; verificado (suíte, build astro 82
  páginas, graph-smoke)
- [ ] (candidato) **guard de não-reimplementação** — ver `-logistica`

## Stack de teste (convergido com o refarm)

A suíte migrou **`node:test` → Vitest** via o codemod `node-test-to-vitest` do refarm (69 arquivos, 14
CJS `.js`→`.mjs`). `pnpm test` = `vitest run`. Isso **fechou o proof do codemod** (robusto no consumidor
real: assert/toThrow/rejects/regex/BOM/CJS→ESM) e **destravou teste TS** no `.site` (o grafo acima).

## Próxima ação concreta

Os 3 blocos de T3 estão **assimilados**, a **reference vault** (acceptance gate) passou com gap ledger
vazio, e o **grafo do Explore já lê a fonte `records:v1`** (com cobertura TS). O que resta de produto:
**records ETL real** (profile com fonte/transform reais — decisão de quais notas/vocab) e a **records
view astro** (convergir as superfícies existentes, sem página nova). A POC então é a reference vault com
as 3 fixtures trocadas por adapters reais. `credentials:v1` (T2) entra após o heartwood-signing no refarm.

Do lado refarm (pós-codemod): publicar T3 npm · ADR-078 fase 2 · os 3 candidatos profundos
(verification-as-completion, tool-less orchestrator, `context:v1`) · handoff yaml codec + credentials.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

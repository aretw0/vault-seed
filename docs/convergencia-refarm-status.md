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

## Proof oficial do handoff 2026-07-03

O checkout oficial assimilou o pacote `vault-seed-ready` do refarm
(`sourceGitSha` `6a6d31fa2cf5d64fd6abc555448541388beb8077`) e registrou a
proof em [`convergencia-refarm-proof-2026-07-03.md`](./convergencia-refarm-proof-2026-07-03.md):
20 tarballs verificados por SHA-256, overrides transientes alinhados ao
`consumerInstall.pnpmOverrides`, lockfile refresh/reinstall, 9 arquivos/33 testes
Vitest verdes, `records:manifest` com 93 records validado, `site:build` verde e
`release:package:smoke:json` verde.

### T2 (jornada soberana) — credentials:v1 assimilado, UX pendente
`credentials:v1` (VC/wallet W3C) **assimilado** (2026-07-01): vendorizado + conformance passando com
assinatura heartwood real (Ed25519). Fundação pronta atrás de seam. Falta o **produto**: a UX do
headspace pra emitir/apresentar/verificar VC (telas). Isso é vault-seed-local quando priorizado.

## Trabalho pendente no vault-seed (quando os blocos pousarem)

Por bloco, seguir a doutrina (`-logistica`): **vendorizar `file:` → consumer-contract test → adoção
atrás de seam de produto (degradação graciosa)**.

Assimilação (vendorização + contract-test):
- [x] `enrichment:v1` — `scripts/refarm_enrichment_consumer_contract.test.mjs`
- [x] `records:v1` — `scripts/refarm_records_consumer_contract.test.mjs`
- [x] `source-web` (+ `source-contract-v1` via override) — `scripts/refarm_source_web_consumer_contract.test.mjs`
- [x] `credentials:v1` — `scripts/refarm_credentials_consumer_contract.test.mjs` (vendor
  credentials-contract + identity-heartwood + storage-memory; overrides identity/storage/heartwood;
  **round-trip: provider assinado por heartwood passa o conformance do contrato, 8 checks**)

Adoção / produto (design já escrito em `docs/superpowers/specs/`):
- [x] **records ETL profile runner** — `scripts/records_etl.mjs` (source snapshot → `records:v1` →
  `enrichment:v1`, degradação graciosa) + teste
- [x] **records view — camada de dados** — `scripts/generate_records_data.mjs` (notas PARA →
  `records:v1`: folder→`@type`, frontmatter→fields, links→relations; convergência) + teste
- [x] **records:v1 manifest — artefato distribuível servido** — `scripts/generate_records_manifest.mjs`
  (notas reais → `resolveLinks` → `records:v1` validado, **76 note records + 17 Source records = 93**,
  uma só shape, 0 falhas; `records:v1` modela qualquer entidade de conhecimento, não só notas), servido em
  `/records-manifest.json` via endpoint astro (`.site/pages/records-manifest.json.ts`) + teste. **Decisão
  de produto (aprovada): manifesto-como-artefato + superfícies são views (o grafo já é), sem página nova.**
  O `@context` agora **resolve** (refarm serve `/contexts/records/v1`, `a01bdc1c`) → linked-data real.
- [~] **records ETL real** — as duas pontas genéricas pousaram; falta costurar num profile coeso +
  trocar as fixtures da reference vault por adapters reais.
  - [x] **fonte real** — os feeds do vault (`fontes/feeds.opml`) viram `records:v1` `@type [KnowledgeRecord, Source]`
    (config mapeia a pasta `fontes`→`Source`) carregando o vocab `source:v1` (`sourceKind: feed`,
    `sourceLocation: xmlUrl`); 17 no manifesto servido (`73b3f9f`). Fonte natural do conteúdo de exemplo
    (as notas não têm chave externa → key-lookup seria forçado). `Source` proposto ao `@context` do refarm.
  - [x] **transform real** — `scripts/enrichment_key_lookup.mjs`: `createKeyLookupEnrichmentProvider({ keyField, lookup })`
    genérico (lookup injetado: fixture no teste/reference, resolver real downstream), provenance idempotente,
    `runEnrichmentV1Conformance` verde (`4d86e47`). O lookup específico é a especialização do POC/downstream.
  - [ ] **costura** — profile coeso source→records→enrichment com decisão de produto (quais fontes/vocab)
    e as 3 fixtures da reference vault trocadas por adapters reais (= a POC).
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
- [x] **superfície de tabela (requirements) via `records:v1`** — `scripts/generate_records_data.mjs`
  (`recordsToTable(records, opts)` / `buildRecordsTable(notes, config)`, espelhando `buildRecordsGraph`):
  projeção config-driven (`records.surface.table.columns`, senão derivadas das field keys), uma linha por
  record com type/cells/relation-count. **Uma superfície é uma VIEW sobre `records:v1`, igual ao grafo —
  requisitos são só records com fields** (`62dfc54`); comentários neutralizados p/ não vazar domínio (`9e529d8`).
  A view astro é consumidora fina (reconciliar com a direção MDX a seguir).
- [x] **guard de não-reimplementação** — `scripts/refarm_no_reimplementation_contract.test.mjs`
  bloqueia nomes de arquivos de alto sinal para novas capacidades genéricas locais
  (`*-contract`, `*-provider`, `*-conformance`, etc.) sem allowlist explícita.

## Stack de teste (convergido com o refarm)

A suíte migrou **`node:test` → Vitest** via o codemod `node-test-to-vitest` do refarm (69 arquivos, 14
CJS `.js`→`.mjs`). `pnpm test` = `vitest run`. Isso **fechou o proof do codemod** (robusto no consumidor
real: assert/toThrow/rejects/regex/BOM/CJS→ESM) e **destravou teste TS** no `.site` (o grafo acima).

## Próxima ação concreta

Os 3 blocos de T3 estão **assimilados**, a **reference vault** (acceptance gate) passou com gap ledger
vazio, e o **grafo do Explore já lê a fonte `records:v1`** (com cobertura TS). As duas pontas do **records
ETL real** pousaram genéricas — **fonte** (feeds→`Source`/`source:v1`, 17 no manifesto servido) e
**transform** (`enrichment_key_lookup`, conformance verde) — e uma 2ª superfície-view (**tabela**) já
espelha o grafo. O que resta de produto:
1. **costurar o ETL real** num profile coeso source→records→enrichment e **trocar as 3 fixtures da
   reference vault por adapters reais** (= a POC).
2. **records view astro** — consumidora fina das superfícies (grafo + tabela), reconciliar com a direção
   MDX, sem página nova.
`credentials:v1` (T2) entra após o heartwood-signing no refarm.

Do lado refarm (pós-codemod): publicar T3 npm · ADR-078 fase 2 · os 3 candidatos profundos
(verification-as-completion, tool-less orchestrator, `context:v1`) · handoff yaml codec + credentials.

Preparação local para o publish: o runbook
[`convergencia-refarm-release.md`](./convergencia-refarm-release.md) está alinhado ao handoff de 20
tarballs e há um check mecânico em `scripts/check_refarm_publication_readiness.mjs`
(`pnpm run refarm:publication:plan`) que lista as 11 refs diretas, os 16 overrides e a troca exata
`file:`→npm quando o refarm informar as versões publicadas.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-release.md`** — runbook de graduação: `file:`→npm + remoção de overrides + release do vault-seed (quando o refarm publicar)
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

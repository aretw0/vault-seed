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
| `@refarm.dev/silo` | credenciais (`silo.js`) em namespace `publishing` | **vendorizado + adotado no adapter**; `packages/cli/test/silo.test.js` |
| `@refarm.dev/local-surface` | superfície local/white-label | **vendorizado no handoff oficial + contract-test ✓**; `scripts/refarm_local_surface_consumer_contract.test.mjs` |
| `@refarm.dev/enrichment-contract-v1` | enriquecimento de records (ETL) | **vendorizado + contract-test ✓**; provider genérico local e reference vault verdes |
| `@refarm.dev/records-contract-v1` | modelo de records (view + ETL) | **vendorizado + contract-test ✓**; manifesto, grafo e tabela já usam `records:v1` |
| `@refarm.dev/source-web` (+ transitivo `source-contract-v1` via override) | aquisição/snapshot de fonte web (fixture sanitizada) → ETL | **vendorizado + contract-test ✓**; reference vault compõe `source-web`→`records:v1`→`enrichment:v1` |

## Blocos a chegar do refarm

(vazio — os blocos de T3 estão assimilados; o de T2 abaixo é capability refarm/POC.)

## Proof oficial do handoff 2026-07-03

O checkout oficial assimilou o pacote `vault-seed-ready` do refarm
(`sourceGitSha` `9aaf54d580d823de64eee7419fbdd42f5d179fa5`) e registrou a
proof em [`convergencia-refarm-proof-2026-07-03.md`](./convergencia-refarm-proof-2026-07-03.md):
21 tarballs verificados por SHA-256, overrides transientes alinhados ao
`consumerInstall.pnpmOverrides`, lockfile refresh/reinstall, 9 arquivos/33 testes
Vitest verdes, `records:manifest` com 93 records validado, `site:build` verde e
`release:package:smoke:json` verde.

Após essa proof, dois blocos foram adiantados e depois incorporados ao handoff
oficial:

- `@refarm.dev/silo` passou de plano para adapter real: `packages/cli/src/silo.js`
  grava credenciais em `SiloCore.saveSecret("publishing", key, value)`, lê por
  `listSecrets("publishing")`, mantém fallback para `tokens` legado e preserva
  `contacts.location` como estado de produto.
- `@refarm.dev/local-surface` entrou no handoff oficial de 21 tarballs
  (`refarm.dev-local-surface-0.1.0.tgz`, SHA-256
  `fe889457797673bb2985d79cecf1007e2ab7a23189c7921a8239a10d73e2f921`) e
  continua provado com manifest local-first, render DS, launch plan white-label
  e `quality:v1`.

### T2 (jornada soberana) — credentials:v1 assimilado, UX pendente
`credentials:v1` (VC/wallet W3C) **assimilado** (2026-07-01): vendorizado + conformance passando com
assinatura heartwood real (Ed25519). Fundação pronta atrás de seam. Falta o **produto**: a UX do
headspace pra emitir/apresentar/verificar VC (telas). Isso é vault-seed-local quando priorizado.

## Trabalho restante no vault-seed (pós-handoff)

Para novos blocos, seguir a doutrina (`-logistica`): **vendorizar `file:` → consumer-contract test →
adoção atrás de seam de produto (degradação graciosa)**. Para os blocos atuais, a assimilação já
fechou; o trabalho restante é produto/POC.

Assimilação (vendorização + contract-test):
- [x] `enrichment:v1` — `scripts/refarm_enrichment_consumer_contract.test.mjs`
- [x] `records:v1` — `scripts/refarm_records_consumer_contract.test.mjs`
- [x] `source-web` (+ `source-contract-v1` via override) — `scripts/refarm_source_web_consumer_contract.test.mjs`
- [x] `credentials:v1` — `scripts/refarm_credentials_consumer_contract.test.mjs` (vendor
  credentials-contract + identity-heartwood + storage-memory; overrides identity/storage/heartwood;
  **round-trip: provider assinado por heartwood passa o conformance do contrato, 8 checks**)
- [x] `silo` — `packages/cli/src/silo.js` delega storage de credenciais para
  `@refarm.dev/silo`, com fallback legado e testes focados
- [x] `local-surface:v1` — proof para Trabalho 1, agora selecionada no handoff
  oficial `vault-seed-ready`

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
- [x] **records ETL real — profile coeso** — `scripts/vault_records_profile.mjs`
  (`records:profile`) costura source real do vault → `records:v1` → enrichment
  opcional e grava `.dgk/records-profile-report.json`; o manifesto de artifacts
  inclui esse report quando presente.
  - [x] **fonte real** — os feeds do vault (`fontes/feeds.opml`) viram `records:v1` `@type [KnowledgeRecord, Source]`
    (config mapeia a pasta `fontes`→`Source`) carregando o vocab `source:v1` (`sourceKind: feed`,
    `sourceLocation: xmlUrl`); 17 no manifesto servido (`73b3f9f`). Fonte natural do conteúdo de exemplo
    (as notas não têm chave externa → key-lookup seria forçado). `Source` proposto ao `@context` do refarm.
  - [x] **transform real** — `scripts/enrichment_key_lookup.mjs`: `createKeyLookupEnrichmentProvider({ keyField, lookup })`
    genérico (lookup injetado: fixture no teste/reference, resolver real downstream), provenance idempotente,
    `runEnrichmentV1Conformance` verde (`4d86e47`). O lookup específico é a especialização do POC/downstream.
  - [x] **costura genérica** — profile coeso source→records→enrichment com
    source/lookup injetáveis e fallback sem refarm.
  - [ ] **especialização POC** — trocar source/lookup por adapters reais
    privados e vocabulário do projeto, sem mudar o runner.
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

Os 3 blocos de T3 estão **assimilados**, a **reference vault** (acceptance gate)
passou com gap ledger vazio, e o **grafo do Explore já lê a fonte `records:v1`**
(com cobertura TS). O **records ETL real** agora tem profile coeso
(`records:profile`) e report local rastreável em `artifact-contract-v1`. O que
resta de produto:
1. **especializar o profile para a POC** — trocar source/lookup por adapters
   reais privados, mantendo o runner e os contratos.
2. **records view astro** — consumidora fina das superfícies (grafo + tabela), reconciliar com a direção
   MDX, sem página nova.
`credentials:v1` (T2) já está assimilado; a próxima fatia é UX/produto do
headspace/wallet, não contrato.

Do lado refarm: publicar a lane `vault-seed-ready` completa · ADR-078 fase 2 ·
os candidatos profundos que ainda precisarem de proof
(verification-as-completion, tool-less orchestrator, `context:v1`).

Preparação local para o publish: o runbook
[`convergencia-refarm-release.md`](./convergencia-refarm-release.md) está alinhado ao handoff de 21
tarballs e há um check mecânico em `scripts/check_refarm_publication_readiness.mjs`
(`pnpm run refarm:publication:plan`) que lista as 13 refs diretas, os 18 overrides e a troca exata
`file:`→npm quando o refarm informar as versões publicadas.

## Mapa de docs de convergência

- **`-status.md`** (este) — estado + próximos passos (START HERE)
- **`-logistica.md`** — doutrina: pipeline de assimilação + guards + transição publish
- **`-deps.md`** — mecânica `file:`→npm + armadilhas pnpm 11 + re-sync
- **`-release.md`** — runbook de graduação: `file:`→npm + remoção de overrides + release do vault-seed (quando o refarm publicar)
- **`-feedback.md`** — ledger porta-voz (defeitos/lacunas relayados ao refarm)
- **`-ds-lab.md`, `-homestead-admin.md`** — por-bloco
- **`docs/superpowers/specs/2026-06-30-records-*`** — designs de produto do vault-seed

# Proof oficial `vault-seed` do handoff refarm — 2026-07-03

Este arquivo é a proof downstream oficial do checkout local `vault-seed` para o
handoff `vault-seed-ready` do refarm gerado em 2026-07-03.

## Pacote consumido

- origem no refarm: `.refarm/handoff/vault-seed/2026-07-03/`
- container refarm usado para copiar: `kind_fermat`
- usuário no container: `1001:1001`
- comando de cópia usado no consumidor: `docker cp kind_fermat:/workspaces/refarm/.refarm/handoff/vault-seed/2026-07-03/. vendor/`
- `sourceGitSha`: `9aaf54d580d823de64eee7419fbdd42f5d179fa5`
- `generatedAt`: `2026-07-03T06:00:25.415Z`
- acceptance: `accepted`
- pacote: 21 tarballs, `manifest.json`, `manifest.md`
- gates refarm: 4 required gates, 63 required checks
- consumer proofs declaradas: 21

## Tarballs verificados

Todos os tarballs em `vendor/` foram comparados contra `vendor/manifest.json`.
Resultado: `ok: 21 tarballs match manifest 9aaf54d580d823de64eee7419fbdd42f5d179fa5`.

| Tarball | SHA-256 |
|---|---|
| `refarm.dev-storage-contract-v1-0.1.0.tgz` | `b06bc71b618b34bf51bf01ae87d35ed37846cf562cb08df18ebaaa51aab77abf` |
| `refarm.dev-identity-contract-v1-0.1.0.tgz` | `5c3cba63f6f34ea644afae70fe983a7c2a293a63b9fd33d63030f419d3cef527` |
| `refarm.dev-artifact-contract-v1-0.1.0.tgz` | `9484b35e61977908d11197e674c868d5bf1bf26547fd9af97398c7571d90d8d3` |
| `refarm.dev-channel-policy-v1-0.1.0.tgz` | `63e666e0f364309dcb213edb49f41e44980f2144451d9d4b412f1c87fd899ae9` |
| `refarm.dev-effort-contract-v1-0.1.0.tgz` | `3f1d8701322233e66408a0b2412328f2029db0760962071fff7cd4bff1bc73a3` |
| `refarm.dev-quality-contract-v1-0.1.0.tgz` | `1dbe3df2bf9cffebaf120bbfb6aef5455f4821f67dc50ecc1a6160e5fdd45d86` |
| `refarm.dev-source-contract-v1-0.1.0.tgz` | `8efb8631dfe5dd39db3d6249b57a372ea931e030558ff3d555805f4c351f974b` |
| `refarm.dev-enrichment-contract-v1-0.1.0.tgz` | `5cc33a867e847d691722d1a77c8343ef7b81d2b86a99e45cc49fa2595797847c` |
| `refarm.dev-records-contract-v1-0.1.0.tgz` | `d64b554f0900471761c02667bdde1664fa29f572e02c7e7bec5f73858b0bfa1f` |
| `refarm.dev-process-handoff-0.1.0.tgz` | `d1bd357e7d52f6183a256115bbd32efb84b59e9cf0f29256e04d28e24bb84145` |
| `refarm.dev-release-engine-0.1.0.tgz` | `476d9bb6f2af658282b24b456f578ab06da7ce0c0146b4b9a24747f0bbc60939` |
| `refarm.dev-heartwood-0.1.0.tgz` | `95b1f0a026d14e35237d9c9435c319ec1a605851d4df6d1a6e420b441899bc9c` |
| `refarm.dev-silo-0.1.0.tgz` | `e23cc494b1b9a6399ae15621b178ea26a084819b50a13e39e92742465cc2e1c5` |
| `refarm.dev-storage-memory-0.1.0.tgz` | `276e5e930b90a82b68e11676433bbf0292b17f89b7cc77691026c1067f0d7d44` |
| `refarm.dev-credentials-contract-v1-0.1.0.tgz` | `bb81767587e44f7010417133546ee5f7051fe7e427e3406dd95d39ad29251a32` |
| `refarm.dev-dispatch-surface-0.1.0.tgz` | `7ea0dfd1a2a43e501a6af9893fe9f99720f38da891c341dd7de8a83a02bfc8fc` |
| `refarm.dev-ds-0.1.0.tgz` | `9504c4682971338fc4d7c70e288c03c0be7a8619b415b7a45348a7a5dbe4c48b` |
| `refarm.dev-source-web-0.1.0.tgz` | `96a8fe55c856427f17a90e1441b33b5573b02ecfe836d02fd942c0016ceb55a5` |
| `refarm.dev-content-projection-0.1.0.tgz` | `9a6a8e8d13fb84a950a9937397d7630c3f0822d2b6b3649aeb205a83c1299a5c` |
| `refarm.dev-identity-heartwood-0.1.0.tgz` | `8fce1939c8906d18de93ad56a7e10e345f609971958a19794d372d604ba86e91` |
| `refarm.dev-local-surface-0.1.0.tgz` | `fe889457797673bb2985d79cecf1007e2ab7a23189c7921a8239a10d73e2f921` |

## Instalação downstream

Dependências diretas novas no `vault-seed`:

- `@refarm.dev/content-projection`: `file:vendor/refarm.dev-content-projection-0.1.0.tgz`
- `@refarm.dev/local-surface`: `file:vendor/refarm.dev-local-surface-0.1.0.tgz`
- `@refarm.dev/quality-contract-v1`: `file:vendor/refarm.dev-quality-contract-v1-0.1.0.tgz`
- `@refarm.dev/silo`: `file:vendor/refarm.dev-silo-0.1.0.tgz`

Nota: `local-surface` começou como proof adiantada, mas agora está incluido no
handoff oficial de 21 tarballs. O `vendor/` local foi ressincronizado do refarm
com:

```powershell
docker cp kind_fermat:/workspaces/refarm/.refarm/handoff/vault-seed/2026-07-03/. vendor/
pnpm install --lockfile-only --ignore-scripts
```

SHA-256 local de `local-surface`:
`fe889457797673bb2985d79cecf1007e2ab7a23189c7921a8239a10d73e2f921`.

O `pnpm-workspace.yaml` recebeu overrides para todos os pacotes inéditos do
handoff, não só os diretos, porque o pnpm 11 não aplica `pnpm.overrides` dentro
de `package.json` neste workspace. Isso evita que dependências transitivas
inéditas tentem resolver no registry público antes da publicação do refarm.

Refresh executado após substituir os tarballs:

```powershell
pnpm -C . install --lockfile-only --ignore-scripts
pnpm -C . update '@refarm.dev/records-contract-v1' '@refarm.dev/source-web' '@refarm.dev/enrichment-contract-v1' '@refarm.dev/content-projection' '@refarm.dev/quality-contract-v1' --lockfile-only --ignore-scripts
pnpm -C . install --ignore-scripts
```

Motivo: os tarballs `file:` mantêm nome e versão durante o handoff
pre-publicação, então a troca de bytes exige refresh explícito da integrity no
lockfile antes das consumer proofs.

## Consumer proofs executadas

```powershell
pnpm -C . exec vitest run scripts/refarm_quality_consumer_contract.test.mjs scripts/refarm_content_projection_consumer_contract.test.mjs scripts/refarm_records_consumer_contract.test.mjs scripts/refarm_enrichment_consumer_contract.test.mjs scripts/refarm_source_web_consumer_contract.test.mjs scripts/records_etl.test.mjs scripts/generate_records_data.test.mjs scripts/generate_records_manifest.test.mjs scripts/records_table_surface.test.mjs
```

Resultado: 9 arquivos, 33 testes, todos verdes.

```powershell
pnpm -C . run records:manifest
```

Resultado: `records:v1 manifest — 93 records [validated (ok=true, failures=0)]`.

```powershell
pnpm -C . run site:build
```

Resultado: build Astro verde, 86 paginas geradas, endpoint
`/records-manifest.json` incluido. Aviso unico observado: deprecacao Astro para
`markdown.remarkPlugins`/`markdown.rehypePlugins`.

```powershell
pnpm -C . run release:package:smoke:json
```

Resultado: `ok=true`, 5 pacotes empacotados, wheel/sdist de
`packages/lab-runtime`, `blockers=[]`, `warnings=[]`. A primeira tentativa local
falhou por permissao no cache global do `uv`; a repeticao fora do sandbox passou.

## Provas especificas adicionais

Depois da proof geral do handoff, duas provas antigas que ainda apareciam como
pendentes na matriz do refarm foram revalidadas no checkout oficial:

```powershell
pnpm -C . exec vitest run scripts/refarm_channel_policy_consumer_contract.test.mjs scripts/publication_outbox.test.mjs scripts/publish_to_telegram.test.mjs scripts/refarm_process_handoff_consumer_contract.test.mjs scripts/no_raw_child_process_contract.test.mjs scripts/refarm_publish_hold_contract.test.mjs
```

Resultado: 6 arquivos, 18 testes, todos verdes.

Cobertura:

- `channel-policy` — `scripts/prepare_publication_outbox.mjs` emite
  `refarm.channel-delivery-envelope.v1` quando o contrato esta disponivel, e
  `scripts/publication_outbox.test.mjs` valida o envelope com
  `validateChannelDeliveryEnvelope`.
- Telegram adapter — `scripts/publish_to_telegram.test.mjs` consome
  `deliveries` e usa `delivery.idempotencyKey` como chave de estado, mantendo
  chamadas de provider e UX downstream.
- `process-handoff` — `@aretw0/dgk-runner` e `@aretw0/dgk-cli` pinam
  `@refarm.dev/process-handoff`; `scripts/no_raw_child_process_contract.test.mjs`
  preserva a fronteira sem `node:child_process` cru nos pacotes de produto.
- publish hold — `scripts/refarm_publish_hold_contract.test.mjs` confirma que
  pacotes publicaveis com `file:@refarm.dev/*` continuam segurados.

```powershell
pnpm -C . run outbox:prepare
```

Resultado: `.dgk/outbox-publicacao.json` gerado com 1 item e validado como
envelope quando `@refarm.dev/channel-policy-v1` esta presente.

```powershell
pnpm -C . run artifacts:manifest
```

Resultado: `.dgk/task-artifacts.json` gerado com 3 artifacts e validado por
`@refarm.dev/artifact-contract-v1`: manifesto de datasets do Lab, outbox de
publicacao e `records-manifest.json`.

## Provas pós-handoff adiantadas

```powershell
node node_modules/vitest/vitest.mjs run packages/cli/test/silo.test.js scripts/refarm_local_surface_consumer_contract.test.mjs
```

Resultado: 2 arquivos, 15 testes, todos verdes.

Cobertura:

- `silo` — `packages/cli/src/silo.js` delega credenciais para
  `SiloCore.saveSecret("publishing", key, value)`, lê via
  `listSecrets("publishing")`, remove via `removeSecret`, mantém fallback para
  `tokens` legado e preserva `contacts.location` como estado local do produto.
- `local-surface:v1` — `scripts/refarm_local_surface_consumer_contract.test.mjs`
  consome o pacote do handoff oficial, cria manifest `refarm.local-surface.v1`, renderiza
  HTML via DS, gera launch plan white-label (`dgk ...`) e valida relatório
  `quality:v1` sem mover rotas, screenshots, adapters ou vocabulário de produto
  para o refarm.

## Consumer proofs cobertas

Esta rodada cobre o pacote completo, com enfase nos itens novos e nos itens T3:

- `artifact-contract.lab-outbox-evidence`
- `channel-policy.telegram-delivery-envelope`
- `process-handoff.dgk-runner-adapter`
- `quality-contract.declared-lint-envelope`
- `content-projection.markdown-mdx-records`
- `silo.publishing-credentials-adapter`
- `local-surface.white-label-operator-proof`
- `requirements-source-contract.transitive-source-web-support`
- `requirements-enrichment.private-provider-wrapper`
- `requirements-records.knowledge-manifest`
- `requirements-source-web.authenticated-capture`

Os demais `consumerProofs` do manifesto continuam representados pelo pacote
vendorizado e pelo status de assimilacao ja registrado nos docs de convergencia.

## Boundary confirmado

O refarm continua responsavel por primitivas neutras e publicaveis. O
`vault-seed` permanece responsavel por produto e linguagem downstream:

- labels e comandos `dgk`;
- UX do vault, PARA, Obsidian/Foam e superficies Astro;
- vocabularios e profiles de conteudo;
- notebooks e copia de publicacao;
- adapters/provider especificos das POCs.

Nada nesta proof move descoberta de sistemas, login, seletores, providers
privados ou vocabulario especifico para o refarm.

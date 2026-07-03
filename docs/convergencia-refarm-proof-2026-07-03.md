# Proof oficial `vault-seed` do handoff refarm — 2026-07-03

Este arquivo é a proof downstream oficial do checkout local `vault-seed` para o
handoff `vault-seed-ready` do refarm gerado em 2026-07-03.

## Pacote consumido

- origem no refarm: `.refarm/handoff/vault-seed/2026-07-03/`
- container refarm usado para copiar: `kind_fermat`
- usuário no container: `1001:1001`
- comando de cópia usado no consumidor: `docker cp kind_fermat:/workspaces/refarm/.refarm/handoff/vault-seed/2026-07-03/. vendor/`
- `sourceGitSha`: `6a6d31fa2cf5d64fd6abc555448541388beb8077`
- `generatedAt`: `2026-07-03T03:47:53.985Z`
- acceptance: `accepted`
- pacote: 20 tarballs, `manifest.json`, `manifest.md`
- gates refarm: 4 required gates, 58 required checks
- consumer proofs declaradas: 20

## Tarballs verificados

Todos os tarballs em `vendor/` foram comparados contra `vendor/manifest.json`.
Resultado: `ok: 20 tarballs match manifest 6a6d31fa2cf5d64fd6abc555448541388beb8077`.

| Tarball | SHA-256 |
|---|---|
| `refarm.dev-artifact-contract-v1-0.1.0.tgz` | `197d71655e20014f2b8795bcdcc27cba321c468c51c9875c5bb24444574a7dce` |
| `refarm.dev-channel-policy-v1-0.1.0.tgz` | `4c2b5b76c300a6dbf91523ede99e3a770b18b74548a8cdf7330c3f3adff20c81` |
| `refarm.dev-content-projection-0.1.0.tgz` | `f220d7e2119555801c83e7ad518fe2c90ea1610f95477926760c6e5829ae099d` |
| `refarm.dev-credentials-contract-v1-0.1.0.tgz` | `bb81767587e44f7010417133546ee5f7051fe7e427e3406dd95d39ad29251a32` |
| `refarm.dev-dispatch-surface-0.1.0.tgz` | `874b8a0ce8a3bd4d5f490a98d568fc44c88b258461c10a4e29ad3ddff7dcb392` |
| `refarm.dev-ds-0.1.0.tgz` | `9504c4682971338fc4d7c70e288c03c0be7a8619b415b7a45348a7a5dbe4c48b` |
| `refarm.dev-effort-contract-v1-0.1.0.tgz` | `f4d880e5293fd43d99550ba7448191ea4fd67863be9345c975776abc8f8d3101` |
| `refarm.dev-enrichment-contract-v1-0.1.0.tgz` | `eefca674c8bf7a54759ff8c1ee741b8c0f81f5fcf138d739a23317a608f58d0e` |
| `refarm.dev-heartwood-0.1.0.tgz` | `95b1f0a026d14e35237d9c9435c319ec1a605851d4df6d1a6e420b441899bc9c` |
| `refarm.dev-identity-contract-v1-0.1.0.tgz` | `b20ae63ef7c6facb48af1e16616868682ad89762cb0e999bb80ef21b5714d548` |
| `refarm.dev-identity-heartwood-0.1.0.tgz` | `8c02045b5d30b49b1d853c2ac51ac3554de5f2f8d3c415f751624e7ea9ca5674` |
| `refarm.dev-process-handoff-0.1.0.tgz` | `9d88e5f6f74015ccf400e5c4f28e630f8287a1b45b59e3a8f31533f5fc572d7a` |
| `refarm.dev-quality-contract-v1-0.1.0.tgz` | `bee3a0828c5afbdd4f84c152816a2c3e40736c4a4d5be6b8cf9e43b5939f9ff9` |
| `refarm.dev-records-contract-v1-0.1.0.tgz` | `c6fc47242e6c63463c5945c6d6c1e38bc5756524d65afbdfcae58c7a47ba7c8f` |
| `refarm.dev-release-engine-0.1.0.tgz` | `476d9bb6f2af658282b24b456f578ab06da7ce0c0146b4b9a24747f0bbc60939` |
| `refarm.dev-silo-0.1.0.tgz` | `f3f1f8fe57b754169b2f6299396955f559102362897df292ec2d0d712e26f0c0` |
| `refarm.dev-source-contract-v1-0.1.0.tgz` | `8efb8631dfe5dd39db3d6249b57a372ea931e030558ff3d555805f4c351f974b` |
| `refarm.dev-source-web-0.1.0.tgz` | `ca33f09ed9159cdf20439565be5dba23e1f05724e5cd168923b3d5991d75e9a5` |
| `refarm.dev-storage-contract-v1-0.1.0.tgz` | `8cff344d2eeb3b0b812338dc46e7c0f1d25e1b282ed88fb90e8607af2222f31c` |
| `refarm.dev-storage-memory-0.1.0.tgz` | `276e5e930b90a82b68e11676433bbf0292b17f89b7cc77691026c1067f0d7d44` |

## Instalação downstream

Dependências diretas novas no `vault-seed`:

- `@refarm.dev/content-projection`: `file:vendor/refarm.dev-content-projection-0.1.0.tgz`
- `@refarm.dev/local-surface`: `file:vendor/refarm.dev-local-surface-0.1.0.tgz`
- `@refarm.dev/quality-contract-v1`: `file:vendor/refarm.dev-quality-contract-v1-0.1.0.tgz`
- `@refarm.dev/silo`: `file:vendor/refarm.dev-silo-0.1.0.tgz`

Nota: `local-surface` é candidate tarball posterior ao handoff oficial de 20
tarballs. Foi gerado no refarm atual (`sourceGitSha`
`e0ad0527779b03d247c27b64b722d96e980b5f4b`) com:

```powershell
docker exec -u 1001:1001 kind_fermat pnpm --filter '@refarm.dev/local-surface' run build
docker exec -u 1001:1001 kind_fermat pnpm --filter '@refarm.dev/local-surface' pack --pack-destination /tmp/refarm-local-surface-proof
docker cp kind_fermat:/tmp/refarm-local-surface-proof/refarm.dev-local-surface-0.1.0.tgz vendor\refarm.dev-local-surface-0.1.0.tgz
```

SHA-256 local: `e4651f9eac6e458c862c65ee3bfcd5ff7d7f1e3a4ce58a665166400e83d7b553`.

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
  consome o candidate tarball, cria manifest `refarm.local-surface.v1`, renderiza
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

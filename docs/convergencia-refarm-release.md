# Convergência refarm — runbook de release (`file:` → npm + release do vault-seed)

Este é o passo de **graduação** do consumo: quando o refarm publicar os blocos
`@refarm.dev/*`, o `vault-seed` troca os tarballs `file:vendor/*.tgz` por versões
do registry, remove overrides transitivos e faz seu próprio release.

Entra no fim do pipeline de assimilação
([`convergencia-refarm-logistica.md`](./convergencia-refarm-logistica.md)).

> **Ordem é crítica.** O refarm publica primeiro e por completo. Só então o
> `vault-seed` troca. Se um transitivo ainda não estiver no npm, `pnpm install`
> quebra ou resolve uma superfície diferente da proof.

## Estado atual

Proof oficial: [`convergencia-refarm-proof-2026-07-03.md`](./convergencia-refarm-proof-2026-07-03.md).

- handoff consumido: `.refarm/handoff/vault-seed/2026-07-03/`
- `sourceGitSha`: `4f0e058d1a108a3f185d99fd931f6dd93b703a1c`
- pacote aceito: 23 tarballs, 72 required checks, 23 consumer proofs
- refs diretas atuais no root: 15 `file:vendor/*.tgz`
- overrides atuais: 23 `@refarm.dev/*` no `pnpm-workspace.yaml`
- o check `refarm:publication:plan` separa esses números: **23 pacotes no handoff**
  e **23 pacotes com refs `file:`/overrides a migrar**. Alguns continuam
  vendor-only no produto (`@refarm.dev/dispatch-surface`, `@refarm.dev/effort-contract-v1`
  e `@refarm.dev/release-engine`), mas permanecem em overrides para preservar
  resolução transitiva idêntica ao handoff.
- `@refarm.dev/local-surface` agora faz parte do handoff oficial
  `vault-seed-ready`; a proof downstream anterior foi assimilada pelo refarm e
  o vendor local foi ressincronizado contra o manifest novo.

Refs diretas atuais:

| Seção | Pacote |
|---|---|
| `dependencies` | `@refarm.dev/artifact-contract-v1` |
| `dependencies` | `@refarm.dev/channel-policy-v1` |
| `dependencies` | `@refarm.dev/content-projection` |
| `dependencies` | `@refarm.dev/credentials-contract-v1` |
| `dependencies` | `@refarm.dev/ds-astro` |
| `dependencies` | `@refarm.dev/enrichment-contract-v1` |
| `dependencies` | `@refarm.dev/identity-heartwood` |
| `dependencies` | `@refarm.dev/local-surface` |
| `dependencies` | `@refarm.dev/quality-contract-v1` |
| `dependencies` | `@refarm.dev/records-contract-v1` |
| `dependencies` | `@refarm.dev/silo` |
| `dependencies` | `@refarm.dev/source-web` |
| `dependencies` | `@refarm.dev/storage-memory` |
| `devDependencies` | `@refarm.dev/ds` |
| `devDependencies` | `@refarm.dev/health` |

Overrides atuais:

`artifact-contract-v1`, `channel-policy-v1`, `content-projection`,
`credentials-contract-v1`, `dispatch-surface`, `ds`, `ds-astro`,
`effort-contract-v1`, `enrichment-contract-v1`, `health`, `heartwood`,
`identity-contract-v1`, `identity-heartwood`, `local-surface`,
`process-handoff`, `quality-contract-v1`, `records-contract-v1`,
`release-engine`, `silo`, `source-contract-v1`, `source-web`,
`storage-contract-v1`, `storage-memory`.

## Pré-condição

- refarm rodou `changeset version` + `changeset publish`;
- todos os pacotes acima estão publicados no npm;
- o `vault-seed` recebeu as versões publicadas exatas.

Não assumir `0.1.0`. O `changeset version` pode ter aplicado bump antes do
publish.

## Check antes da troca

Sem rede, para ver a superfície de migração:

```powershell
pnpm run refarm:publication:plan
```

Com uma versão única hipotética:

```powershell
node scripts/check_refarm_publication_readiness.mjs --assume-version 0.1.0
```

Com mapa real de versões:

```powershell
node scripts/check_refarm_publication_readiness.mjs --versions refarm-published-versions.json
```

Formato esperado do mapa:

```json
{
  "@refarm.dev/records-contract-v1": "0.1.0",
  "@refarm.dev/source-web": "0.1.0"
}
```

Com consulta direta ao npm, quando a rede estiver disponível:

```powershell
node scripts/check_refarm_publication_readiness.mjs --probe-npm
```

O check só retorna verde quando todo pacote `@refarm.dev/*` ainda em `file:` ou
override tem uma versão publicada conhecida. Ele não edita arquivos; imprime o
plano exato.

## Passo 1 — trocar refs diretas

Em `package.json`, trocar cada:

```text
file:vendor/refarm.dev-<pkg>-<v>.tgz
```

por:

```text
^<versão publicada>
```

Aplicar para as 15 refs diretas listadas acima.

## Passo 2 — remover overrides

No `pnpm-workspace.yaml`, remover o bloco `overrides` de `@refarm.dev/*` quando
todos os transitivos estiverem publicados.

Se apenas parte dos pacotes publicar, **não fazer meia troca**. Manter `file:` e
overrides até a onda completa estar disponível ou até o refarm emitir um novo
handoff parcial com fronteira explícita.

## Passo 3 — manter `minimumReleaseAgeExclude`

Manter:

```yaml
minimumReleaseAgeExclude:
  - "@refarm.dev/*"
```

Pacotes recém-publicados são mais novos que o `minimumReleaseAge`. O exclude
continua correto para esse scope curado até os pacotes envelhecerem.

## Passo 4 — atualizar consumer-contract tests

Os testes que hoje assinalam `file:vendor/...` devem passar a aceitar a versão
registry (`^x.y.z`) ou, preferencialmente, o predicado "não é `file:` e resolve
do pacote instalado".

Tests afetados:

- `scripts/refarm_channel_policy_consumer_contract.test.mjs`
- `scripts/refarm_artifact_consumer_contract.test.mjs`
- `scripts/refarm_content_projection_consumer_contract.test.mjs`
- `scripts/refarm_credentials_consumer_contract.test.mjs`
- `scripts/refarm_ds_consumer_contract.test.mjs`
- `scripts/refarm_ds_html_consumer_contract.test.mjs`
- `scripts/refarm_enrichment_consumer_contract.test.mjs`
- `scripts/refarm_health_consumer_contract.test.mjs`
- `scripts/refarm_process_handoff_consumer_contract.test.mjs`
- `scripts/refarm_quality_consumer_contract.test.mjs`
- `scripts/refarm_records_consumer_contract.test.mjs`
- `scripts/refarm_source_web_consumer_contract.test.mjs`

As asserções de superfície (`.d.ts`, round-trips, conformance, projeções) não
mudam. Só muda o modo de resolução.

## Passo 5 — reinstalar e provar

```powershell
pnpm install
pnpm test
pnpm run records:manifest
pnpm run site:build
pnpm run release:package:smoke:json
```

Tudo verde valida que o npm entrega os mesmos contratos que os tarballs
provaram.

## Passo 6 — limpar `vendor`

Os `vendor/*.tgz` são gitignored. Remover é limpeza local, não mudança de repo.
Guardar os tarballs até a primeira suíte verde com npm, para rollback.

## Passo 7 — release do vault-seed

Seguir o pipeline existente:

```powershell
pnpm changeset
pnpm changeset:version
pnpm run release:verify
pnpm changeset:publish
```

O bump parte do estado atual (`0.4.2`) e deve refletir a mudança real de consumo
do refarm. Depois, seguir o fluxo normal `main` → `develop`.

## Rollback

Se uma publicação vier quebrada:

1. Reverter o pacote afetado para `file:vendor/...tgz`.
2. Recolocar o override transitivo necessário.
3. Rodar `pnpm install`.
4. Rodar os consumer-contract tests afetados.

O atrito de re-extração do pnpm visto no handoff não se aplica do mesmo jeito ao
registry: versões npm carregam integrity própria. O rollback para `file:` volta a
exigir atenção ao lockfile.

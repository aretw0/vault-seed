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

Handoff consumido: `.refarm/handoff/vault-seed/2026-08-30/` (lane `consumer-ready`). O
mecanismo e a lista de passos da troca estão em
[`convergencia-refarm-deps.md`](./convergencia-refarm-deps.md#troca-para-o-registry-após-o-publish).

- `sourceGitSha`: `50539198782b5d1d396337a31520bf7e022c95ec`
- packet aceito: 27 tarballs, 88 required checks, 27 consumer proofs
- vendorizados e rastreados no git: 19 tarballs (`vendor/manifest.json` guarda os sha256;
  `scripts/refarm_vendor_manifest.test.mjs` confere)
- refs diretas: 14 `file:vendor/*.tgz` na raiz, 3 em `packages/cli`, 1 em `packages/dgk-runner`
- overrides: 19 `@refarm.dev/*` no `pnpm-workspace.yaml`, iguais ao conjunto vendorizado
- o check `refarm:publication:plan` lê `vendor/manifest.json`: **19 pacotes no manifest** e
  **19 pacotes com refs `file:`/overrides a migrar**; não há mais pacote vendor-only
- fora da lane (retidos): `@refarm.dev/health`, `@refarm.dev/config`
- no packet mas não vendorizados (nada consome): `dispatch-surface`, `effort-contract-v1`,
  `release-engine`, `node-contract-v1`, `plugin-manifest`, `provenance-contract-v1`, `std`,
  `vault-contract-v1`

Refs diretas atuais:

| Onde | Seção | Pacote |
|---|---|---|
| raiz | `dependencies` | `@refarm.dev/artifact-contract-v1` |
| raiz | `dependencies` | `@refarm.dev/channel-policy-v1` |
| raiz | `dependencies` | `@refarm.dev/content-projection` |
| raiz | `dependencies` | `@refarm.dev/credentials-contract-v1` |
| raiz | `dependencies` | `@refarm.dev/ds-astro` |
| raiz | `dependencies` | `@refarm.dev/enrichment-contract-v1` |
| raiz | `dependencies` | `@refarm.dev/identity-heartwood` |
| raiz | `dependencies` | `@refarm.dev/local-surface` |
| raiz | `dependencies` | `@refarm.dev/quality-contract-v1` |
| raiz | `dependencies` | `@refarm.dev/records-contract-v1` |
| raiz | `dependencies` | `@refarm.dev/silo` |
| raiz | `dependencies` | `@refarm.dev/source-web` |
| raiz | `dependencies` | `@refarm.dev/storage-memory` |
| raiz | `devDependencies` | `@refarm.dev/ds` |
| `packages/cli` | `dependencies` | `@refarm.dev/ds`, `@refarm.dev/process-handoff`, `@refarm.dev/silo` |
| `packages/dgk-runner` | `dependencies` | `@refarm.dev/process-handoff` |

Overrides atuais:

`artifact-contract-v1`, `channel-policy-v1`, `content-projection`,
`credentials-contract-v1`, `ds`, `ds-astro`, `enrichment-contract-v1`, `heartwood`,
`identity-contract-v1`, `identity-heartwood`, `local-surface`, `process-handoff`,
`quality-contract-v1`, `records-contract-v1`, `silo`, `source-contract-v1`, `source-web`,
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

Aplicar para as refs diretas listadas acima (raiz, `packages/cli` e `packages/dgk-runner`);
os comandos `pnpm add` exatos estão na seção "Troca para o registry após o publish" de
[`convergencia-refarm-deps.md`](./convergencia-refarm-deps.md). Remover também o `dgk.releaseHold`
dos pacotes que só o carregavam por causa das deps `file:`.

## Passo 2 — remover overrides

No `pnpm-workspace.yaml`, remover o bloco `overrides` de `@refarm.dev/*` quando
todos os transitivos estiverem publicados.

Se apenas parte dos pacotes publicar, **não fazer meia troca**. Manter `file:` e
overrides até a onda completa estar disponível ou até o refarm emitir um novo
handoff parcial com fronteira explícita.

## Passo 3 — remover `minimumReleaseAgeExclude`

Remover:

```yaml
minimumReleaseAgeExclude:
  - "@refarm.dev/*"
```

O exclude existia porque a auditoria do lockfile batia em 404 nos pacotes não
publicados. Depois do publish eles resolvem; pacote recém-publicado ainda é mais
novo que o `minimumReleaseAge`, mas a política está em `severity: warn`, então
avisa sem bloquear.

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
- `scripts/refarm_process_handoff_consumer_contract.test.mjs`
- `scripts/refarm_quality_consumer_contract.test.mjs`
- `scripts/refarm_records_consumer_contract.test.mjs`
- `scripts/refarm_source_web_consumer_contract.test.mjs`

Apagar `scripts/refarm_vendor_manifest.test.mjs`: ele só confere os tarballs rastreados.

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

Os `vendor/*.tgz` e o `vendor/manifest.json` são rastreados durante a transição:
`git rm -r vendor/` e apagar as linhas `!/vendor/*.tgz` e `!/vendor/manifest.json` do
`.gitignore`. Guardar uma cópia local dos tarballs até a primeira suíte verde com npm,
para rollback.

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

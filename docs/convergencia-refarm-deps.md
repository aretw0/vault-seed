# Consumindo packages do refarm (`file:` agora → npm no publish)

> Status: nota de mecanismo (atualizada em 2026-08-30). Como o vault-seed depende de pacotes `@refarm.dev/*`
> durante o consumer-proof (antes do publish) e como migrar quando publicarem. Resolve a fricção
> com a política de supply-chain e prepara a transição.

## Agora (consumer-proof, pacotes não-publicados)

- O vault-seed depende de `@refarm.dev/*` via **tarball local**: `package.json` →
  `"@refarm.dev/<pkg>": "file:vendor/<pkg>.tgz"` (o `.tgz` vem do packet de handoff do refarm).
  Durante a transição os `vendor/*.tgz` e o `vendor/manifest.json` são **rastreados no git** (o resto
  de `vendor/` continua ignorado), para que o CI do GitHub instale sem ter o packet do refarm no disco.
  O manifest registra `sourceGitSha`, data do packet e o sha256 de cada tarball;
  `scripts/refarm_vendor_manifest.test.mjs` falha se os bytes divergirem, se sobrar tarball fora do
  manifest ou se alguma ref `file:` apontar para tarball não vendorizado.
- No `pnpm-lock.yaml` isso vira uma **entrada `file:`** com `version: 0.1.0`. **Atenção:** entrada
  `file:` **não é** auto-isenta — o pnpm 11 ainda roda a auditoria de supply-chain do lockfile sobre
  ela e tenta age-checar `@refarm.dev/ds@0.1.0` no registry (404 → não-publicado), **quebrando o
  clean install**. Por isso o `pnpm-workspace.yaml` isenta o escopo inteiro:

  ```yaml
  minimumReleaseAgeExclude:
    - "@refarm.dev/*"
  ```

  (`severity: warn` **não** rebaixa essa auditoria de lockfile num install completo — só o exclude
  resolve.)

### Armadilha (já tropeçamos)

**O clean install (`rm -rf node_modules && pnpm install`) quebra sem o `minimumReleaseAgeExclude`**:
a auditoria de lockfile do pnpm 11 verifica cada entrada — inclusive `file:` com versão — e bate no
404 do `@refarm.dev/*` não-publicado. Installs **incrementais pulam** essa auditoria, então o
problema fica **latente** até um clone limpo / CI. Correção durável: o exclude do escopo acima.

Armadilha relacionada: **não importar um `pnpm-lock` de outro checkout** para essas deps — porte o
**código** por patch e deixe o **lock** ser resolvido localmente.

Outra (refresh de tarball `file:`): o pnpm cacheia o unpack no store global **pela path**
(`store/v11/file+vendor+<pkg>.tgz`), não pela integrity. Trocar o `.tgz` mantendo o nome **não**
re-extrai (`pnpm install` diz "Already up to date"). Para refrescar: atualizar a `integrity` no lock
(sha512 do novo `.tgz`) **e** apagar a entrada do store; ou `rm -rf node_modules` + install.

## Troca para o registry após o publish

Quando o refarm publicar a lane `consumer-ready` (0.1.0) no npm, a troca é mecânica e completa —
não fazer meia troca (ver [`convergencia-refarm-release.md`](./convergencia-refarm-release.md)):

1. Trocar cada ref direta pelo registry, na raiz:

   ```sh
   pnpm add @refarm.dev/artifact-contract-v1@^0.1.0 @refarm.dev/channel-policy-v1@^0.1.0 \
     @refarm.dev/content-projection@^0.1.0 @refarm.dev/credentials-contract-v1@^0.1.0 \
     @refarm.dev/ds-astro@^0.1.0 @refarm.dev/enrichment-contract-v1@^0.1.0 \
     @refarm.dev/identity-heartwood@^0.1.0 @refarm.dev/local-surface@^0.1.0 \
     @refarm.dev/quality-contract-v1@^0.1.0 @refarm.dev/records-contract-v1@^0.1.0 \
     @refarm.dev/silo@^0.1.0 @refarm.dev/source-web@^0.1.0 @refarm.dev/storage-memory@^0.1.0
   pnpm add -D @refarm.dev/ds@^0.1.0
   pnpm --filter @aretw0/dgk-cli add @refarm.dev/ds@^0.1.0 @refarm.dev/process-handoff@^0.1.0 @refarm.dev/silo@^0.1.0
   pnpm --filter @aretw0/dgk-runner add @refarm.dev/process-handoff@^0.1.0
   ```

   e remover `dgk.releaseHold` de `packages/cli` e `packages/dgk-runner` (o guard
   `scripts/refarm_publish_hold_contract.test.mjs` só exige o hold enquanto houver dep `file:`).
2. Remover o bloco `overrides` inteiro e o `minimumReleaseAgeExclude` do `pnpm-workspace.yaml`
   (os transitivos `heartwood`, `identity-contract-v1`, `source-contract-v1` e
   `storage-contract-v1` passam a resolver pelo registry; a política `minimumReleaseAge` já está em
   `severity: warn`, então pacote recém-publicado avisa, não bloqueia).
3. Apagar `vendor/` (`git rm -r vendor/`) e as duas linhas de negação em `.gitignore`
   (`!/vendor/*.tgz`, `!/vendor/manifest.json`); `/vendor/*` pode ficar.
4. Apagar `scripts/refarm_vendor_manifest.test.mjs` (o hash test só existe para os tarballs
   rastreados) e trocar, nos consumer-contract tests, as asserções `file:vendor/...` pela versão
   do registry.
5. `pnpm install && pnpm test` — o lock passa a ter entradas de registry com integrity própria.

O **código consumidor não muda** na transição — o Lab (`.site/styles/marimo-vault.css`) e o admin
(rota `/_ds` no `serve.js`) consomem o package igual, seja `file:` ou publicado.

### Deps transitivas não-publicadas

Quando consumimos um pacote que **depende de outro `@refarm.dev/*` ainda não publicado**, fixa-se o
**direto** no `package.json` do consumidor e o **transitivo** via `overrides`, até ambos publicarem.
Exemplos atuais: `content-projection` precisa de `records-contract-v1`; `credentials-contract-v1` precisa
de `identity-contract-v1`/`storage-contract-v1`; `identity-heartwood` precisa de
`identity-contract-v1`/`heartwood`; `silo` precisa de `heartwood`; `source-web` precisa de
`source-contract-v1`; `storage-memory` precisa de `storage-contract-v1`; `ds`, `ds-astro` e
`local-surface` precisam de `quality-contract-v1`.

Direto — no `package.json` do consumidor, como `file:` pro tarball em `vendor/`:
```jsonc
{ "dependencies": { "@refarm.dev/content-projection": "file:vendor/refarm.dev-content-projection-0.1.0.tgz" } }
```
(o `file:` é relativo ao `package.json` que o declara; num pacote aninhado como
`packages/cli`, ajuste a profundidade do caminho até o `vendor/` da raiz.)

Transitivo — **no `pnpm-workspace.yaml`** (raiz), chave top-level `overrides:`. **Atenção:** o
pnpm 11 **não lê** mais `pnpm.overrides` do `package.json` (o install avisa
`The "pnpm" field in package.json is no longer read by pnpm`); o override **tem** que ir no
`pnpm-workspace.yaml`:
```yaml
overrides:
  "@refarm.dev/records-contract-v1": "file:vendor/refarm.dev-records-contract-v1-0.1.0.tgz"
```
(o `file:` do override é relativo à raiz do workspace.)

## Estado atual

O handoff oficial atual é `.refarm/handoff/vault-seed/2026-08-30/` (lane `consumer-ready`,
`sourceGitSha` `50539198782b5d1d396337a31520bf7e022c95ec`, 27 pacotes, 88 required checks, 27
consumer proofs):

- 19 tarballs vendorizados e rastreados, verificados por SHA-256 contra `vendor/manifest.json`
  (`scripts/refarm_vendor_manifest.test.mjs`);
- 14 refs diretas em `package.json` (raiz) + 3 em `packages/cli` + 1 em `packages/dgk-runner`;
- 19 overrides em `pnpm-workspace.yaml` — exatamente o conjunto vendorizado;
- `@refarm.dev/health` e `@refarm.dev/config` **ficaram fora da lane** (retidos até `config` passar
  no boundary review): devDependency, override, tarball e contract-test foram removidos;
- `dispatch-surface`, `effort-contract-v1` e `release-engine` estão no packet mas **não são
  vendorizados**: nada no vault-seed os consome, direta ou transitivamente. Idem para os novos
  `node-contract-v1`, `plugin-manifest`, `provenance-contract-v1`, `std` e `vault-contract-v1`;
- o packet renomeou os ids de schema/kind de `refarm.*` para `sovereign.*`
  (`sovereign.channel-delivery-envelope.v1`, `sovereign.task-artifacts.v1`, ...); os scripts
  já leem as constantes dos pacotes, e os testes que fixavam a string antiga passaram a usá-las.

Refs diretas atuais (raiz):

`artifact-contract-v1`, `channel-policy-v1`, `content-projection`,
`credentials-contract-v1`, `ds-astro`, `enrichment-contract-v1`,
`identity-heartwood`, `local-surface`, `quality-contract-v1`, `records-contract-v1`,
`silo`, `source-web`, `storage-memory`, `ds` (dev). Em `packages/cli`: `ds`,
`process-handoff`, `silo`. Em `packages/dgk-runner`: `process-handoff`.

Transitivos (só via override): `heartwood`, `identity-contract-v1`, `source-contract-v1`,
`storage-contract-v1`.

Para a migração final, usar o runbook graduado:
[`convergencia-refarm-release.md`](./convergencia-refarm-release.md), apoiado pelo check:

```powershell
pnpm run refarm:publication:plan
```

# Consumindo packages do refarm (`file:` agora → npm no publish)

> Status: nota de mecanismo (atualizada em 2026-07-03). Como o vault-seed depende de pacotes `@refarm.dev/*`
> durante o consumer-proof (antes do publish) e como migrar quando publicarem. Resolve a fricção
> com a política de supply-chain e prepara a transição.

## Agora (consumer-proof, pacotes não-publicados)

- O vault-seed depende de `@refarm.dev/*` via **tarball local**: `package.json` →
  `"@refarm.dev/<pkg>": "file:vendor/<pkg>.tgz"` (o `.tgz` vem do `pnpm pack` no refarm; `vendor/`
  é gitignorado).
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

## No publish (quando `@refarm.dev/<pkg>` sair no npm)

1. trocar `package.json`: `"file:vendor/<pkg>.tgz"` → `"@refarm.dev/<pkg>": "^<versão>"`;
2. `pnpm install` → o lock vira **entrada de registry**. O escopo `@refarm.dev/*` **permanece** no
   `minimumReleaseAgeExclude` (é o scope curado do próprio mantenedor — a proteção de age-check
   contra publish malicioso de terceiros não se aplica), então a transição não altera a política;
3. remover o `.tgz` de `vendor/`.

O **código consumidor não muda** na transição — o Lab (`.site/styles/marimo-vault.css`) e o admin
(rota `/_ds` no `serve.js`) consomem o package igual, seja `file:` ou publicado.

### Deps transitivas não-publicadas

Quando consumimos um pacote que **depende de outro `@refarm.dev/*` ainda não publicado**, fixa-se o
**direto** no `package.json` do consumidor e o **transitivo** via `overrides`, até ambos publicarem.
Exemplos atuais: `content-projection` precisa de `records-contract-v1`; `credentials-contract-v1` precisa
de `identity-contract-v1`/`storage-contract-v1`; `identity-heartwood` precisa de
`identity-contract-v1`/`heartwood`; `ds` precisa de `quality-contract-v1`.

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

O handoff oficial atual é `.refarm/handoff/vault-seed/2026-07-03/`, provado em
[`convergencia-refarm-proof-2026-07-03.md`](./convergencia-refarm-proof-2026-07-03.md):

- 20 tarballs copiados e verificados por SHA-256 contra `vendor/manifest.json`;
- 16 pacotes `@refarm.dev/*` com refs `file:` ou overrides locais;
- 11 refs diretas em `package.json`;
- 16 overrides em `pnpm-workspace.yaml`;
- proof focada cobrindo contracts, outbox, process handoff, artifact manifest, records/source/enrichment,
  content projection e quality.

Refs diretas atuais:

`artifact-contract-v1`, `channel-policy-v1`, `content-projection`,
`credentials-contract-v1`, `enrichment-contract-v1`, `identity-heartwood`,
`quality-contract-v1`, `records-contract-v1`, `source-web`, `storage-memory`, `ds`.

Overrides atuais:

`artifact-contract-v1`, `channel-policy-v1`, `content-projection`,
`credentials-contract-v1`, `ds`, `enrichment-contract-v1`, `heartwood`,
`identity-contract-v1`, `identity-heartwood`, `process-handoff`,
`quality-contract-v1`, `records-contract-v1`, `source-contract-v1`,
`source-web`, `storage-contract-v1`, `storage-memory`.

Para a migração final, usar o runbook graduado:
[`convergencia-refarm-release.md`](./convergencia-refarm-release.md), apoiado pelo check:

```powershell
pnpm run refarm:publication:plan
```

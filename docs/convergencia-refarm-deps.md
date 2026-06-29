# Consumindo packages do refarm (`file:` agora → npm no publish)

> Status: nota de mecanismo (2026-06-25). Como o vault-seed depende de pacotes `@refarm.dev/*`
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

### Dep transitiva não-publicada (ao consumir `homestead-ssr`)

Quando consumirmos um pacote que **depende de outro `@refarm.dev/*` ainda não publicado** (ex.:
`homestead-ssr` declara `@refarm.dev/ds@0.1.0`), fixa-se o **direto** no `package.json` do
consumidor e o **transitivo** via `overrides`, até ambos publicarem.

Direto — no `package.json` do consumidor, como `file:` pro tarball em `vendor/`:
```jsonc
{ "dependencies": { "@refarm.dev/homestead-ssr": "file:vendor/refarm.dev-homestead-ssr-0.1.0.tgz" } }
```
(o `file:` é relativo ao `package.json` que o declara; num pacote aninhado como
`packages/cli`, ajuste a profundidade do caminho até o `vendor/` da raiz.)

Transitivo — **no `pnpm-workspace.yaml`** (raiz), chave top-level `overrides:`. **Atenção:** o
pnpm 11 **não lê** mais `pnpm.overrides` do `package.json` (o install avisa
`The "pnpm" field in package.json is no longer read by pnpm`); o override **tem** que ir no
`pnpm-workspace.yaml`:
```yaml
overrides:
  "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz"
```
(o `file:` do override é relativo à raiz do workspace.)

## Estado atual

- **`@refarm.dev/ds`** — consumido via `file:` (4a Lab tokens + 4b admin `/_ds`). Instala e serve. ✓
  - Superfície enxuta (sem tests/stories/fontes TS); subpaths consumidos (`./tokens.css`,
    `./components.css`, `./themes/*`) seguem exportados (exports ganharam `./contract` +
    `./theme-conformance`, aditivo).
  - **Re-sync 2026-06-28 (product-neutral css):** o `verde-jardim.css` trocou os seletores de
    `[data-refarm-theme=…]`/`@layer refarm.theme` para `:where([data-ds-theme=…], [data-refarm-theme=…])`/
    `@layer ds.theme` — `data-ds-theme` é o atributo canônico agora, com **`data-refarm-theme`
    preservado como alias `:where()`**. Os **valores dos 17 tokens são idênticos**, então o runtime
    do tema **não muda** (nosso export segue setando `refarmTheme`, coberto pelo alias) e o fallback
    do `marimo-vault.css` continua alinhado. Só o `refarm_ds_consumer_contract.test.mjs` foi
    atualizado pros novos seletores (mantendo a checagem dos 17 valores). Re-vendorizado do handoff
    `2026-06-28`; integrity do lock atualizada; suíte 356/356.
  - **Adoção futura opcional:** migrar nosso export/`marimo-vault.css` para o atributo neutro
    `data-ds-theme` (e os guards `:not([data-ds-theme])`) quando/ se o refarm aposentar o alias
    `data-refarm-theme`. Hoje desnecessário — o alias cobre.
- **`@refarm.dev/homestead-ssr`** (leaf) — **alvo correto** do rebuild do admin (incremento futuro).
  Substitui o SDK full `@refarm.dev/homestead`: é só `dist/` (`shellHtml/cardHtml/buttonHtml`), sem
  puxar o closure do SDK. Ainda **não consumido** — o 4b adotou só os tokens do `ds`. Tarball
  candidato em `refarm/.refarm/handoff/vault-seed/2026-06-26/refarm.dev-homestead-ssr-0.1.0.tgz`.
  (O full-homestead foi removido do nosso `vendor/` por ser o alvo errado.)

> Handoff `2026-06-26` também trouxe `@refarm.dev/heartwood` (core cripto WASM) e `@refarm.dev/silo`
> (segredos) — **fora da caminhada de UI/admin/lab**; assimilação futura, não-agora.

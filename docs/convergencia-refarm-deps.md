# Consumindo packages do refarm (`file:` agora → npm no publish)

> Status: nota de mecanismo (2026-06-25). Como o vault-seed depende de pacotes `@refarm.dev/*`
> durante o consumer-proof (antes do publish) e como migrar quando publicarem. Resolve a fricção
> com a política de supply-chain e prepara a transição.

## Agora (consumer-proof, pacotes não-publicados)

- O vault-seed depende de `@refarm.dev/*` via **tarball local**: `package.json` →
  `"@refarm.dev/<pkg>": "file:vendor/<pkg>.tgz"` (o `.tgz` vem do `pnpm pack` no refarm; `vendor/`
  é gitignorado).
- No `pnpm-lock.yaml` isso vira uma **entrada `file:`** → **isenta** da política
  `minimumReleaseAge` (é dep local, não de registry; não há release para age-checkar).

### Armadilha (já tropeçamos)

**Não importar um `pnpm-lock` de outro checkout** para essas deps. O lock do cache do bibliotecário
registrava `@refarm.dev/ds` como **entrada de registry**, e a política tentou verificá-la no npm
(404 → não-publicado) e **quebrou o `pnpm install`**. Correção: restaurar o lock e deixar o pnpm
resolver a dep `file:` **no próprio host** (vira entrada `file:`, isenta). Porte o **código** por
patch; deixe o **lock** ser regenerado localmente.

## No publish (quando `@refarm.dev/<pkg>` sair no npm)

1. trocar `package.json`: `"file:vendor/<pkg>.tgz"` → `"@refarm.dev/<pkg>": "^<versão>"`;
2. `pnpm install` → o lock vira **entrada de registry** → a `minimumReleaseAge` passa a
   **age-checkar a release real** (correto, sem buraco na política);
3. remover o `.tgz` de `vendor/`.

O **código consumidor não muda** na transição — o Lab (`.site/styles/marimo-vault.css`) e o admin
(rota `/_ds` no `serve.js`) consomem o package igual, seja `file:` ou publicado.

### Dep transitiva não-publicada (ao consumir `homestead-ssr`)

Quando consumirmos um pacote que **depende de outro `@refarm.dev/*` ainda não publicado** (ex.:
`homestead-ssr` depende de `ds`), fixar **direto e transitivo** no mesmo tarball local via
`pnpm.overrides`, até ambos publicarem:

```jsonc
{
  "dependencies": {
    "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz",
    "@refarm.dev/homestead-ssr": "file:vendor/refarm.dev-homestead-ssr-0.1.0.tgz"
  },
  "pnpm": { "overrides": { "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz" } }
}
```

## Estado atual

- **`@refarm.dev/ds`** — consumido via `file:` (4a Lab tokens + 4b admin `/_ds`). Instala e serve. ✓
  - O refarm **enxugou a superfície publicável** (`fix(ds): trim published package surface`): tarball
    sem tests/stories. Os subpaths que consumimos (`./tokens.css`, `./components.css`, `./themes/*`)
    **seguem exportados** → no publish nosso código não muda. Nosso tarball local em `vendor/` é o
    pré-trim; o trimado canônico vive em `refarm/.refarm/handoff/vault-seed/2026-06-26/`.
- **`@refarm.dev/homestead-ssr`** (leaf) — **alvo correto** do rebuild do admin (incremento futuro).
  Substitui o SDK full `@refarm.dev/homestead`: é só `dist/` (`shellHtml/cardHtml/buttonHtml`), sem
  puxar o closure do SDK. Ainda **não consumido** — o 4b adotou só os tokens do `ds`. Tarball
  candidato em `refarm/.refarm/handoff/vault-seed/2026-06-26/refarm.dev-homestead-ssr-0.1.0.tgz`.
  (O full-homestead foi removido do nosso `vendor/` por ser o alvo errado.)

> Handoff `2026-06-26` também trouxe `@refarm.dev/heartwood` (core cripto WASM) e `@refarm.dev/silo`
> (segredos) — **fora da caminhada de UI/admin/lab**; assimilação futura, não-agora.

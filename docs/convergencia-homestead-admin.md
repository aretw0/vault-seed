# Adoção do `@refarm.dev/homestead/ssr` no admin (4b-consumidor)

> Status: spec de adoção (2026-06-25). Lado **consumidor** do item 4b: o admin UI do `dgk serve`
> deixa de montar HTML inline e passa a compor a partir do tier build-free do homestead. Espelha o
> spec do fornecedor (`refarm specs/features/2026-06-25-homestead-ssr-tier.md`). Gated: depende do
> `@refarm.dev/homestead/ssr` + `@refarm.dev/ds` existirem (consumo dev via tarball — ver
> `refarm docs/DEV_CROSS_REPO_CONSUMPTION.md`).

## Contexto

`packages/cli/src/commands/serve.js` serve um admin via `node:http`: uma string `ADMIN_HTML` com
`<style>` de **paleta própria** (#1a1a2e / #00d4aa — uma terceira, distinta do site e do Lab) e um
client `fetch` vanilla contra `/api/services|status|outbox|rate-limits|sow`. Estrutura: header,
seções **Canais** (grid de cards), **Outbox**, **Rate limits** (tabela), painel de config (form),
footer. Zero deps de frontend, **sem bundler**.

O tier `@refarm.dev/homestead/ssr` (build-free: render helpers em string + tokens do `ds` + a11y)
existe exatamente para esse tipo de superfície servida. O admin é o seu primeiro consumidor.

## Superfície alvo

`packages/cli/src/commands/serve.js` — a constante `ADMIN_HTML` e o client de re-render.

## Migração

1. **Instalar** (dev, não-publicado): `@refarm.dev/homestead/ssr` (que depende do `@refarm.dev/ds`)
   como `file:` tarball (ver `refarm docs/DEV_CROSS_REPO_CONSUMPTION.md`).
2. **Recompor o `ADMIN_HTML`** a partir dos helpers do tier:
   `shellHtml` (doctype/head com tokens do `ds`), `sectionHtml`, `gridHtml`/`cardHtml` (Canais),
   `tableHtml` (Rate limits), `fieldHtml`/`buttonHtml` (painel de config), `feedbackHtml`,
   `footerHtml`, `escapeHtml`.
3. **Remover** o `<style>` de paleta inline e o `esc()` local (vem do `escapeHtml` do tier).
4. **Manter** `node:http`, as rotas `/api/*` e a lógica `fetch` do client.
5. **Client isomórfico:** os helpers são puros (decisão do fornecedor) — o re-render do client
   (`innerHTML`) usa os mesmos helpers em vez dos templates inline.

## Paleta do admin

A paleta bespoke (#1a1a2e / #00d4aa) é **trocada por um tema do `ds`**. Recomendo `verde-jardim`
(consistência com o Lab) ou o `tractor-green` de referência; o teal #00d4aa vira legado. É uma
decisão pequena — ajustar no momento da adoção.

## Verificação

1. `dgk serve` renderiza; o roteiro `docs/roteiro-teste-admin.md` passa sem regressão funcional.
2. **Build-free preservado:** `serve.js` continua `node:http` puro, **sem bundler** adicionado.
3. Tokens vêm do `ds` (a paleta inline sumiu); a11y dos componentes mantida (baked no tier).
4. As ações (config/sow, remover canal) continuam funcionando via `/api/*`.

## Fora de escopo

- **4c** — o painel de config como `CredentialProvider` do `silo` (coleta) é item separado, gated
  pela adoção do `@refarm.dev/silo` (item 8).
- **Studio-host bundled** do homestead — não usado; o admin é superfície servida, não monta plugin.
- **Multi-tema** no admin — single-tema por ora.

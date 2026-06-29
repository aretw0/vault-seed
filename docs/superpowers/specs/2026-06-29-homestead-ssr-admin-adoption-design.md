# Design — 3ª adoção do refarm: `@refarm.dev/homestead-ssr` no admin do `dgk serve`

> Status: design aprovado (2026-06-29). Terceira adoção do programa de ocamento.
> Fatia **A** (SSR das views read-only), com o módulo de render como costura pro
> **B** (admin inteiro em SSR) quando pedir.

## Contexto e objetivo

O admin do `dgk serve` (`packages/cli/src/commands/serve.js`) hoje é uma const
`ADMIN_HTML`: shell estático + `<style>` à mão (classes próprias `.card`/`.grid`/
…) + um `<script>` grande que faz `fetch` de JSON e monta cards/tabelas/campos via
`innerHTML` no **cliente**. O `@refarm.dev/homestead-ssr` fornece os primitivos de
HTML server-side (`shellHtml` + `sectionHtml`/`gridHtml`/`cardHtml`/`tableHtml`/
`fieldHtml`/`buttonHtml`/`feedbackHtml`/`footerHtml`/`escapeHtml`) que emitem classes
`@refarm.dev/ds`. Ocar o admin = trocar o HTML à mão por esses primitivos.

**Achado que define o design:** os helpers de `homestead-ssr/render` (e o `shell`)
são **isomórficos** — puros, zero deps de Node (verificado: `dist/render.js` sem
imports; travado por um teste que contribuímos ao refarm). Então o "descompasso"
(server-side vs admin client-rendered) **se dissolve**: o `serve.js` pode **servir
o `render.js` ao cliente** e usar os **mesmos** helpers no servidor (SSR inicial) e
no cliente (updates), sem duplicar lógica de render.

## Decisões (aprovadas)

1. **Fatia A — SSR das views read-only + render isomórfico.** O servidor renderiza,
   no GET `/`, o shell (`shellHtml`) + as views read-only (canais, outbox, rate-limits)
   via os helpers. O `render.js` do homestead-ssr é servido em `/_hs/render.js`; o
   `<script>` do admin o importa e usa os mesmos helpers nas interações/updates.
2. **Markup `ds`.** As classes passam a ser `ds-*` (de homestead-ssr), estilizadas
   pelo `@refarm.dev/ds` já servido via `/_ds`. O `<style>` à mão + as classes próprias
   saem (pode restar um mínimo de layout que o `ds` não cobrir).
3. **Caminho pro B garantido.** As interações (add/remover chave, salvar config,
   discovery do telegram) seguem por client JS na fatia A, mas já usando os helpers
   servidos. O B converte cada interação em POST + re-render no servidor pelo mesmo
   módulo — sem reescrever a camada de render.
4. **Tier 2, já em publish-hold.** `serve.js` vive no `@aretw0/dgk-cli` (publicado),
   que **já está em publish-hold** pelo `launch-process`. `homestead-ssr` (file:) pega
   carona no mesmo hold; `serve.js` faz **import direto** (não precisa de degradação
   graciosa — diferente dos scripts da raiz).

## Distribuição (por que A NÃO precisa de degradação graciosa)

`serve.js` é distribuído **só** via o pacote npm publicado `@aretw0/dgk-cli` — **não**
pelos scripts da raiz do template. Como o `dgk-cli` está em publish-hold (não sai até
o refarm publicar), o `serve.js` com import direto de `homestead-ssr` não chega a
nenhum repo de usuário antes da transição. A guarda `distributed_scripts_no_static_refarm_import`
mira `scripts/*` (raiz) e **não** se aplica ao `serve.js`. No publish: `homestead-ssr`
entra nas deps publicadas do `dgk-cli` e o hold cai.

## Componentes

### Consumo
- Vendorizar `refarm.dev-homestead-ssr-0.1.0.tgz` (handoff `2026-06-28`).
- `packages/cli/package.json`: `"@refarm.dev/homestead-ssr": "file:../../vendor/refarm.dev-homestead-ssr-0.1.0.tgz"`.
- Dep transitiva: `homestead-ssr` depende de `@refarm.dev/ds@0.1.0`. Fixar no nosso
  tarball local via `pnpm.overrides` (`"@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz"`),
  conforme `docs/convergencia-refarm-deps.md`.
- Teste de contrato de consumidor: `file:` dep + superfície (`shellHtml` + helpers de
  `render`) via `dist/*.d.ts`; + `pnpm.overrides` do `ds` presente.

### `serve.js`
- **Servir o render isomórfico:** nova rota `GET /_hs/render.js` que responde
  `node_modules/@refarm.dev/homestead-ssr/dist/render.js` com `Content-Type:
  text/javascript` (espelha o padrão da rota `/_ds`).
- **SSR no GET `/`:** substituir o `ADMIN_HTML` estático por uma render server-side:
  `shellHtml({ title:"dgk admin", theme:"verde-jardim", assetBase:"/_ds", bodyHtml })`,
  onde `bodyHtml` = `sectionHtml`/`gridHtml`/`cardHtml` (canais, a partir de
  `readAllContacts`/`SERVICES`) + `sectionHtml`/`tableHtml` (outbox de `readOutbox`,
  rate-limits de `readRateLimits`) + os containers interativos (config/discovery) +
  o `<script type="module">` que importa `/_hs/render.js`.
- **Cliente:** o `<script>` passa a importar os helpers de `/_hs/render.js` e os usa
  nos updates (mesma marcação `ds-*`). A render client-side das views read-only que
  hoje roda no load **sai** (server é autoritativo; refresh por recarga/ação).
- O `<style>` à mão é removido (ds estiliza); manter só o mínimo de layout não coberto.

## Verificação
- Novo `scripts/refarm_homestead_ssr_consumer_contract.test.mjs` (ou em `packages/cli/test/`):
  trava o `file:` dep + a superfície + o `pnpm.overrides` do `ds`.
- Teste de que o `GET /` retorna HTML **server-rendered**: contém o shell ds-temado e a
  tabela do outbox renderizada no servidor (não um `<div id="outbox"></div>` vazio).
- Teste de que `GET /_hs/render.js` responde JS importável (status 200, content-type JS,
  exporta `cardHtml`).
- `packages/cli/test/serve.test.js` (endpoints, `spawnFn` injetável) **verde** sem
  alterar asserções.
- `pnpm test` ≥361 + novos; build do `dgk-cli` ok.

## Loop de feedback pro refarm
Já registrado nesta adoção (commit `a1afa932` no refarm): garantia isomórfica
testada+documentada no `homestead-ssr` + sinal de naming/packaging no decision-log.
Registrar no nosso ledger (`docs/convergencia-refarm-feedback.md`) a cobertura do
`homestead-ssr` + o ponteiro pro sinal no refarm.

## Riscos e itens deferidos
- **B (admin inteiro em SSR)** — interações via POST + re-render: incremento futuro;
  a fatia A deixa a costura pronta.
- **`shellHtml` e o `<head>`/`assetBase`:** confirmar no plano como o `shellHtml` linka
  o `ds` (via `assetBase` → `/_ds`) e se embute algo; ajustar as rotas `/_ds` se preciso.
- **Layout residual:** o `ds` pode não cobrir todo o layout do admin (ex.: a lista de
  chats do discovery); manter um CSS mínimo local até o B.

## Critérios de sucesso
1. `GET /` server-rendered via `homestead-ssr` (shell + views read-only ds-temadas);
   `render.js` servido e reusado no cliente (sem duplicação de markup).
2. `<style>`/classes à mão do admin removidos (ds estiliza); comportamento do admin
   preservado pro usuário.
3. Sem publish (dgk-cli segue held); contrato de consumidor + serve.test verdes.
4. Costura pro B no lugar (módulo de render compartilhado servidor/cliente).

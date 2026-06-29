# Adoção do `@refarm.dev/homestead-ssr` no admin — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocar a renderização do admin do `dgk serve` substituindo o HTML/CSS à mão por `@refarm.dev/homestead-ssr` (shell + helpers de view), com um módulo de views **isomórfico** usado no servidor (SSR inicial) e no cliente (updates), sem duplicar markup.

**Architecture:** Um módulo `admin_views.mjs` (puro, importa `@refarm.dev/homestead-ssr/render`) mapeia os dados do admin → markup `ds-*`. O `serve.js` o importa no GET `/` (SSR via `shellHtml`) e o **serve** ao browser em `/_hs/admin_views.js`; o `render.js` do pacote é servido em `/_hs/render.js`; um **import map** no shell faz o specifier `@refarm.dev/homestead-ssr/render` resolver no browser. O `<script type="module">` do admin importa `admin_views.js` e re-renderiza as views nas atualizações.

**Tech Stack:** Node ≥22 (ESM), `node:test`, `node:http` (admin server), `@refarm.dev/homestead-ssr@0.1.0` (tarball handoff `2026-06-28`), `@refarm.dev/ds` (transitivo, via `pnpm.overrides`).

## Global Constraints

- `@refarm.dev/homestead-ssr` via `file:../../vendor/refarm.dev-homestead-ssr-0.1.0.tgz` no `packages/cli/package.json` (vendor/ gitignored; tarball NÃO commitado; handoff `refarm/.refarm/handoff/vault-seed/2026-06-28/`).
- Dep transitiva `@refarm.dev/ds@0.1.0` fixada no nosso tarball local via `pnpm.overrides` no `package.json` raiz: `"pnpm": { "overrides": { "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz" } }`.
- `@refarm.dev/*` já isento da supply-chain via `minimumReleaseAgeExclude` (não mexer).
- **Tier 2, já em publish-hold:** `serve.js` vive no `@aretw0/dgk-cli` (held pelo launch-process). Import direto de `homestead-ssr` é OK (não vai a usuário antes do publish). NÃO adicionar ao `package.template.json`. A guarda `distributed_scripts_no_static_refarm_import` mira `scripts/*` (raiz) e não se aplica.
- Escaping (verificado em `dist/render.js`): `tableHtml` **escapa headers+células** → passar valores crus; `cardHtml` tem `rows`/`actionsHtml` **crus** → escapar manualmente; `sectionHtml` escapa só o título; `buttonHtml`/`fieldHtml` escapam label/attrs/name/value.
- `shellHtml({title, theme, assetBase, bodyHtml})` emite `<head>` com `tokens.css`/`themes/<theme>.css`/`components.css` de `assetBase` e `<body data-ds-theme="<theme>">` — sem scripts no head (import map pode ser o 1º elemento do `bodyHtml`). Usar `theme:"verde-jardim"`, `assetBase:"/_ds"`.
- Comportamento do admin preservado pro usuário; `packages/cli/test/serve.test.js` verde.
- Testes via `node --test`.

---

## File Structure

- `vendor/refarm.dev-homestead-ssr-0.1.0.tgz` — vendorizado (gitignored).
- `packages/cli/package.json` — +dep `file:` homestead-ssr.
- `package.json` (raiz) — +`pnpm.overrides` do ds; +testes no `test`.
- `packages/cli/src/commands/admin_views.mjs` — módulo isomórfico de views (novo).
- `packages/cli/src/commands/serve.js` — rotas `/_hs/*`, GET `/` SSR, client module.
- `packages/cli/test/admin_views.test.mjs` — unit do módulo (novo).
- `packages/cli/test/serve.test.js` — +testes de rota/SSR.
- `scripts/refarm_homestead_ssr_consumer_contract.test.mjs` — contrato (novo).
- `docs/convergencia-refarm-feedback.md` — nota de cobertura.

---

### Task 1: Vendorizar homestead-ssr + dep + override do ds + contrato

**Files:**
- Create: `vendor/refarm.dev-homestead-ssr-0.1.0.tgz` (NÃO commitar)
- Modify: `packages/cli/package.json`, `package.json`
- Test: `scripts/refarm_homestead_ssr_consumer_contract.test.mjs`

**Interfaces:**
- Produces: `@refarm.dev/homestead-ssr` resolvível em `packages/cli`; superfície `{ shellHtml, cardHtml, tableHtml, sectionHtml, gridHtml, buttonHtml, fieldHtml, escapeHtml, feedbackHtml, footerHtml }`; transitivo `@refarm.dev/ds` → tarball local.

- [ ] **Step 1: Write the failing contract test**

Create `scripts/refarm_homestead_ssr_consumer_contract.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("dgk-cli pins @refarm.dev/homestead-ssr via the local tarball", () => {
  const pkg = readJson("packages/cli/package.json");
  assert.equal(
    pkg.dependencies?.["@refarm.dev/homestead-ssr"],
    "file:../../vendor/refarm.dev-homestead-ssr-0.1.0.tgz",
  );
});

test("root overrides the transitive @refarm.dev/ds to the local tarball", () => {
  const root = readJson("package.json");
  assert.equal(root.pnpm?.overrides?.["@refarm.dev/ds"], "file:vendor/refarm.dev-ds-0.1.0.tgz");
});

test("the consumed homestead-ssr surface is exported", () => {
  const renderDts = readFileSync(
    join(ROOT, "packages/cli/node_modules/@refarm.dev/homestead-ssr/dist/render.d.ts"),
    "utf8",
  );
  const shellDts = readFileSync(
    join(ROOT, "packages/cli/node_modules/@refarm.dev/homestead-ssr/dist/shell.d.ts"),
    "utf8",
  );
  for (const name of ["cardHtml", "tableHtml", "sectionHtml", "gridHtml", "buttonHtml", "fieldHtml", "escapeHtml"]) {
    assert.match(renderDts, new RegExp(`export declare function ${name}\\b`), `missing ${name}`);
  }
  assert.match(shellDts, /export declare function shellHtml\b/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/refarm_homestead_ssr_consumer_contract.test.mjs`
Expected: FAIL (dep não fixada; `.d.ts` ausente).

- [ ] **Step 3: Vendorizar + fixar deps + override**

```bash
cp "../../refarm/.refarm/handoff/vault-seed/2026-06-28/refarm.dev-homestead-ssr-0.1.0.tgz" \
   vendor/refarm.dev-homestead-ssr-0.1.0.tgz
```
Em `packages/cli/package.json` `dependencies`, adicionar:
```json
"@refarm.dev/homestead-ssr": "file:../../vendor/refarm.dev-homestead-ssr-0.1.0.tgz"
```
No `package.json` raiz, adicionar (ou estender) o bloco `pnpm`:
```json
"pnpm": {
  "overrides": {
    "@refarm.dev/ds": "file:vendor/refarm.dev-ds-0.1.0.tgz"
  }
}
```
(Se já existir `pnpm`/`overrides`, só acrescentar a chave.)

- [ ] **Step 4: Instalar**

Run: `pnpm install`
Expected: instala sem erro; o `@refarm.dev/ds@0.1.0` que o homestead-ssr declara resolve pro tarball local via override (sem 404).

- [ ] **Step 5: Registrar o teste no `package.json`** (lista do script `test`, junto dos `scripts/*.test.mjs`).

- [ ] **Step 6: Run to verify it passes**

Run: `node --test scripts/refarm_homestead_ssr_consumer_contract.test.mjs`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit (sem o tarball)**

```bash
git add packages/cli/package.json package.json pnpm-lock.yaml scripts/refarm_homestead_ssr_consumer_contract.test.mjs
git commit -m "feat(deps): vendor @refarm.dev/homestead-ssr + ds override + consumer contract"
```

---

### Task 2: Módulo isomórfico `admin_views.mjs` + unit tests

**Files:**
- Create: `packages/cli/src/commands/admin_views.mjs`
- Test: `packages/cli/test/admin_views.test.mjs`

**Interfaces:**
- Consumes: `@refarm.dev/homestead-ssr/render` (Task 1).
- Produces: `channelsHtml(channels, activeSvc?)`, `outboxHtml(items)`, `rateLimitsHtml(limits)` → strings de markup `ds-*`. `channels` = `[{id,label,keys:[{configured,key,preview}]}]`; `items` = `[{title,path,publicationStatus,status,channels,collectedAt}]`; `limits` = `{ <platform>: {lastSentAt, sentInWindow} }`.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/test/admin_views.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelsHtml, outboxHtml, rateLimitsHtml } from "../src/commands/admin_views.mjs";

test("channelsHtml renders ds cards with key rows and action buttons", () => {
  const html = channelsHtml(
    [{ id: "telegram", label: "Telegram", keys: [{ configured: true, key: "TELEGRAM_BOT_TOKEN", preview: "12…ab" }] }],
    "telegram",
  );
  assert.match(html, /ds-section/);
  assert.match(html, /ds-card/);
  assert.match(html, /Telegram/);
  assert.match(html, /TELEGRAM_BOT_TOKEN/);
  assert.match(html, /data-svc="telegram"/);
  assert.match(html, /data-act="cfg"/);
  assert.match(html, /data-act="rm"/); // configured → has remove
  assert.match(html, /data-active="1"/); // activeSvc match
});

test("outboxHtml renders a ds table, escaping cell values once", () => {
  const html = outboxHtml([{ title: "<b>x</b>", path: "a.md", publicationStatus: "draft", channels: ["rss"], collectedAt: "2026-05-26T00:00:00Z" }]);
  assert.match(html, /ds-table/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/); // escaped once (not double)
  assert.match(html, /draft/);
  assert.match(html, /rss/);
  assert.match(html, /2026-05-26/);
});

test("outboxHtml shows an empty state when there are no items", () => {
  assert.match(outboxHtml([]), /Outbox vazio/);
});

test("rateLimitsHtml renders a table or an empty state", () => {
  assert.match(rateLimitsHtml({}), /Sem histórico/);
  assert.match(rateLimitsHtml({ telegram: { sentInWindow: 3 } }), /telegram/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/admin_views.test.mjs`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement the module**

Create `packages/cli/src/commands/admin_views.mjs`:
```js
// Isomorphic admin view builders (server SSR + browser updates) over the
// @refarm.dev/homestead-ssr render helpers. Pure: no Node imports, so serve.js
// can serve this file to the browser (import map maps the bare specifier).
import {
  sectionHtml,
  gridHtml,
  cardHtml,
  tableHtml,
  buttonHtml,
  escapeHtml,
} from "@refarm.dev/homestead-ssr/render";

export function channelsHtml(channels, activeSvc = null) {
  const cards = (channels ?? []).map((ch) => {
    const rows = (ch.keys ?? []).map((k) => {
      const mark = k.configured ? "✓" : "✗";
      const preview = k.preview ? ` <span class="ds-dim">${escapeHtml(k.preview)}</span>` : "";
      return `<div class="ds-key-row"><span>${mark}</span><span>${escapeHtml(k.key)}${preview}</span></div>`;
    });
    const hasAny = (ch.keys ?? []).some((k) => k.configured);
    const actions =
      buttonHtml({ label: "Configurar", variant: "primary", attrs: { "data-act": "cfg" } }) +
      (hasAny ? buttonHtml({ label: "Remover", variant: "danger", attrs: { "data-act": "rm" } }) : "");
    return cardHtml({
      title: ch.label,
      rows,
      active: activeSvc === ch.id,
      actionsHtml: `<div data-svc="${escapeHtml(ch.id)}">${actions}</div>`,
    });
  });
  return sectionHtml("Canais", gridHtml(cards));
}

export function outboxHtml(items) {
  const list = items ?? [];
  if (!list.length) {
    return sectionHtml("Outbox de publicação", `<p class="ds-empty">Outbox vazio — rode: dgk etl</p>`);
  }
  // tableHtml escapes every cell — pass raw values (no double-escaping).
  return sectionHtml(
    "Outbox de publicação",
    tableHtml({
      headers: ["Nota", "Status", "Canais", "Data"],
      rows: list.map((it) => [
        it.title ?? it.path ?? "",
        it.publicationStatus ?? it.status ?? "",
        (it.channels ?? []).join(", "),
        (it.collectedAt ?? "").slice(0, 10),
      ]),
    }),
  );
}

export function rateLimitsHtml(limits) {
  const lims = limits ?? {};
  const ps = Object.keys(lims);
  if (!ps.length) {
    return sectionHtml("Rate limits", `<p class="ds-empty">Sem histórico de rate limits ainda.</p>`);
  }
  return sectionHtml(
    "Rate limits",
    tableHtml({
      headers: ["Plataforma", "Último envio", "Enviados (janela)"],
      rows: ps.map((p) => {
        const d = lims[p] ?? {};
        const last = d.lastSentAt ? new Date(d.lastSentAt).toLocaleTimeString("pt-BR") : "—";
        return [p, last, String(d.sentInWindow ?? 0)];
      }),
    }),
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/admin_views.test.mjs`
Expected: PASS (4 testes).

- [ ] **Step 5: Registrar o teste no `package.json`** (lista do `test`, em `packages/cli/test/...`).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/admin_views.mjs packages/cli/test/admin_views.test.mjs package.json
git commit -m "feat(admin): isomorphic admin view builders over homestead-ssr"
```

---

### Task 3: Servir `/_hs/render.js` e `/_hs/admin_views.js`

**Files:**
- Modify: `packages/cli/src/commands/serve.js`
- Test: `packages/cli/test/serve.test.js`

**Interfaces:**
- Consumes: `admin_views.mjs` (Task 2); `@refarm.dev/homestead-ssr` dist (Task 1).
- Produces: rotas `GET /_hs/render.js` (→ dist render.js do pacote) e `GET /_hs/admin_views.js` (→ a fonte do módulo da Task 2), `Content-Type: text/javascript`.

- [ ] **Step 1: Write the failing test**

Em `packages/cli/test/serve.test.js`, adicionar (dentro do describe que tem `startServer`):
No `describe` que usa `startServer(tmp, siloPath, …)` (o helper retorna `{ address, close }`):
```js
test("serve /_hs/render.js and /_hs/admin_views.js as importable modules", async () => {
  const server = await startServer(tmp, siloPath, {});
  try {
    const base = server.address;
    const r1 = await fetch(`${base}/_hs/render.js`);
    assert.equal(r1.status, 200);
    assert.match(r1.headers.get("content-type") || "", /javascript/);
    assert.match(await r1.text(), /export function cardHtml/);

    const r2 = await fetch(`${base}/_hs/admin_views.js`);
    assert.equal(r2.status, 200);
    const body = await r2.text();
    assert.match(body, /export function channelsHtml/);
    assert.match(body, /@refarm\.dev\/homestead-ssr\/render/); // bare specifier (import map resolves in browser)
  } finally {
    await server.close();
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/serve.test.js`
Expected: FAIL (404 nas rotas `/_hs/*`).

- [ ] **Step 3: Add the `/_hs/` routes in serve.js**

No topo do `serve.js`, garantir os imports (já há `createRequire`, `readFileSync`, `fileURLToPath` em uso — adicionar o que faltar):
```js
import { fileURLToPath } from "node:url";
```
Adicionar, perto do `const require = createRequire(import.meta.url);`:
```js
const ADMIN_VIEWS_PATH = fileURLToPath(new URL("./admin_views.mjs", import.meta.url));
```
No `handleAsync`, logo antes da rota `/_ds/` existente, adicionar:
```js
  // Serve the isomorphic admin render modules to the browser. The admin uses an
  // import map so admin_views.js's `@refarm.dev/homestead-ssr/render` import
  // resolves to /_hs/render.js client-side.
  if (url.pathname === '/_hs/render.js' && method === 'GET') {
    try {
      const file = require.resolve('@refarm.dev/homestead-ssr/render');
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(readFileSync(file, 'utf8'));
    } catch {
      jsonResponse(res, { error: 'render module not found' }, 404);
    }
    return;
  }
  if (url.pathname === '/_hs/admin_views.js' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(readFileSync(ADMIN_VIEWS_PATH, 'utf8'));
    return;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/serve.test.js`
Expected: PASS (incl. o novo teste; os endpoints existentes intactos).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/serve.js packages/cli/test/serve.test.js
git commit -m "feat(admin): serve isomorphic render + admin_views modules at /_hs/"
```

---

### Task 4: GET `/` server-rendered via `shellHtml` + `admin_views`; client re-render isomórfico

**Files:**
- Modify: `packages/cli/src/commands/serve.js`
- Test: `packages/cli/test/serve.test.js`

**Interfaces:**
- Consumes: `shellHtml` (homestead-ssr), `admin_views.mjs` (Task 2), `siloStatus`/`readOutbox`/`readRateLimits` (existentes em serve.js).
- Produces: GET `/` retorna HTML **server-rendered** (shell ds + views read-only montadas no servidor + import map + client module).

- [ ] **Step 1: Write the failing test**

Em `packages/cli/test/serve.test.js`, adicionar:
```js
test("GET / is server-rendered with the ds shell and the outbox table", async () => {
  // an outbox with one item, written where serve.js reads it (.dgk/outbox-publicacao.json under tmp)
  mkdirSync(join(tmp, ".dgk"), { recursive: true });
  writeFileSync(join(tmp, ".dgk", "outbox-publicacao.json"), JSON.stringify({ items: [{ title: "Nota A", path: "a.md", publicationStatus: "draft", channels: ["rss"], collectedAt: "2026-05-26T00:00:00Z" }] }));
  const server = await startServer(tmp, siloPath, {});
  try {
    const html = await fetch(`${server.address}/`).then((r) => r.text());
    assert.match(html, /data-ds-theme="verde-jardim"/);     // ds shell
    assert.match(html, /\/_ds\/themes\/verde-jardim\.css/);  // ds css linked by shellHtml
    assert.match(html, /type="importmap"/);                   // import map present
    assert.match(html, /ds-table/);                           // outbox rendered server-side
    assert.match(html, /Nota A/);                             // the item, in the initial HTML
    assert.doesNotMatch(html, /<div id="outbox"><\/div>/);   // not an empty client placeholder
  } finally {
    await server.close();
  }
});
```
(Confirme o caminho que `readOutbox(root)` lê — `.dgk/outbox-publicacao.json` sob `root` — e ajuste a fixture.)

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/serve.test.js`
Expected: FAIL (GET / ainda devolve o `ADMIN_HTML` estático com `<div id="outbox"></div>` vazio).

- [ ] **Step 3: Import shellHtml + admin_views at the top of serve.js**

Adicionar aos imports do topo:
```js
import { shellHtml } from "@refarm.dev/homestead-ssr";
import { channelsHtml, outboxHtml, rateLimitsHtml } from "./admin_views.mjs";
```

- [ ] **Step 4: Replace the static ADMIN_HTML with a server-render function**

Substituir a const `ADMIN_HTML = \`...\`` (todo o template, do `<!DOCTYPE html>` ao `</html>`) por uma função `renderAdminHtml(root, siloPath)`. O `bodyHtml` mantém o `<script>` cliente, mas: (a) começa com o import map; (b) injeta as views SSR em divs id'd; (c) o `<script>` vira `type="module"` importando `admin_views.js` e os helpers de form. Manter um `<style>` mínimo só pros widgets interativos que o ds não cobre (config-panel/field/chat-list/form-actions).

```js
function renderAdminHtml(root, siloPath) {
  const channels = siloStatus(siloPath);
  const items = readOutbox(root);
  const limits = readRateLimits();

  const residualCss = `
    <style>
      .ds-key-row{font-size:.72rem;color:var(--muted-foreground);display:flex;gap:.4rem}
      .ds-dim{color:var(--muted-foreground)}
      .config-panel{background:var(--card);border:1px solid var(--primary);border-radius:6px;padding:1.2rem;margin-top:1rem}
      .config-panel h3{color:var(--primary);font-size:.9rem;margin-bottom:.3rem}
      .hint{font-size:.75rem;color:var(--muted-foreground);margin-bottom:1rem}
      .chat-list{margin-top:.5rem;max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:4px}
      .chat-item{padding:.4rem .7rem;font-size:.8rem;cursor:pointer;display:flex;gap:.7rem}
      .chat-item:hover{background:var(--muted)} .chat-item.sel{background:var(--accent);color:var(--primary)}
      .chat-idx{color:var(--muted-foreground);min-width:1.5rem}
      .form-actions{display:flex;gap:.5rem;margin-top:1rem}
    </style>`;

  const importMap = `<script type="importmap">
{"imports":{"@refarm.dev/homestead-ssr/render":"/_hs/render.js"}}
</script>`;

  const bodyHtml = `${importMap}
${residualCss}
<h1>⬡ dgk admin</h1>
<div id="channels-view">${channelsHtml(channels, null)}</div>
<div id="config-wrap"></div>
<div id="outbox-view">${outboxHtml(items)}</div>
<div id="ratelimits-view">${rateLimitsHtml(limits)}</div>
<footer id="ts" class="ds-footer"></footer>
${adminClientScript()}`;

  return shellHtml({ title: "dgk admin", theme: "verde-jardim", assetBase: "/_ds", bodyHtml });
}
```

- [ ] **Step 5: Write the client module script (`adminClientScript`)**

Adicionar a função que devolve o `<script type="module">`. Ela importa `admin_views.js` (para as views) e `fieldHtml`/`buttonHtml` do render (via import map) para o form. O `load()` re-renderiza as 3 views; as interações ficam (config/save/remove/discover), agora com markup `ds`:
```js
function adminClientScript() {
  return `<script type="module">
import { channelsHtml, outboxHtml, rateLimitsHtml } from "/_hs/admin_views.js";
import { fieldHtml, buttonHtml, escapeHtml } from "@refarm.dev/homestead-ssr/render";

let svcDefs = {};
let activeSvc = null;

async function init() {
  const s = await fetch('/api/services').then(r => r.json());
  svcDefs = s.services ?? {};
  await load();
}

async function load() {
  const [st, ob, rl] = await Promise.all([
    fetch('/api/status').then(r => r.json()),
    fetch('/api/outbox').then(r => r.json()),
    fetch('/api/rate-limits').then(r => r.json()),
  ]);
  const chv = document.getElementById('channels-view');
  chv.innerHTML = channelsHtml(st.channels, activeSvc);
  chv.onclick = e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('[data-svc]')?.dataset.svc;
    if (!id) return;
    if (btn.dataset.act === 'cfg') openConfig(id);
    if (btn.dataset.act === 'rm') doRemove(id);
  };
  document.getElementById('outbox-view').innerHTML = outboxHtml(ob.items);
  document.getElementById('ratelimits-view').innerHTML = rateLimitsHtml(rl.limits);
  document.getElementById('ts').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
}

function openConfig(id) {
  activeSvc = id;
  const svc = svcDefs[id];
  if (!svc) return;
  const isTelegram = (id === 'telegram');
  const fields = svc.prompts.map(p => fieldHtml({ label: p.label + (p.secret ? ' (deixe em branco para manter)' : ''), name: p.key, type: p.secret ? 'password' : 'text' })).join('');
  const discover = isTelegram ? '<div class="discover-wrap">' + buttonHtml({ label: 'Descobrir chats Telegram', attrs: { type: 'button', id: 'disc-btn' } }) + '<div class="chat-list" id="chat-list" hidden></div></div>' : '';
  document.getElementById('config-wrap').innerHTML =
    '<div class="config-panel"><h3>Configurar ' + escapeHtml(svc.label) + '</h3><p class="hint">' + escapeHtml(svc.hint) + '</p>' +
    '<form id="cfg-form">' + fields + discover +
    '<div class="form-actions">' + buttonHtml({ label: 'Salvar', attrs: { type: 'submit' } }) + buttonHtml({ label: 'Cancelar', variant: 'ghost', attrs: { type: 'button', id: 'cfg-cancel' } }) + '</div></form></div>';
  document.getElementById('cfg-form').onsubmit = saveConfig;
  document.getElementById('cfg-cancel').onclick = closeConfig;
  const dbtn = document.getElementById('disc-btn');
  if (dbtn) dbtn.onclick = discoverChats;
}

function closeConfig() { activeSvc = null; document.getElementById('config-wrap').innerHTML = ''; }

async function saveConfig(e) {
  e.preventDefault();
  const tokens = {};
  for (const [k, v] of new FormData(e.target).entries()) { if (v.trim()) tokens[k] = v.trim(); }
  const res = await fetch('/api/sow', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' }, body: JSON.stringify({ service: activeSvc, tokens }) });
  if (res.ok) { closeConfig(); await load(); } else { const d = await res.json(); alert('Erro: ' + (d.error ?? 'Falha ao salvar')); }
}

async function doRemove(id) {
  const label = svcDefs[id]?.label ?? id;
  if (!confirm('Remover configuração de ' + label + '?')) return;
  const res = await fetch('/api/sow/' + id, { method: 'DELETE', headers: { 'X-Dgk-Admin': '1' } });
  if (res.ok) { if (activeSvc === id) closeConfig(); await load(); } else { const d = await res.json(); alert('Erro: ' + (d.error ?? 'Falha ao remover')); }
}

async function discoverChats() {
  const token = document.querySelector('#cfg-form input[name="TELEGRAM_BOT_TOKEN"]')?.value?.trim();
  if (!token) { alert('Informe o Bot Token primeiro.'); return; }
  const btn = document.getElementById('disc-btn');
  btn.textContent = 'Descobrindo...'; btn.disabled = true;
  const listEl = document.getElementById('chat-list');
  listEl.removeAttribute('hidden'); listEl.innerHTML = '<div class="ds-empty" style="padding:.5rem">Aguardando...</div>';
  try {
    const data = await fetch('/api/sow/telegram/chats', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' }, body: JSON.stringify({ token }) }).then(r => r.json());
    const chats = data.chats ?? [];
    if (!chats.length) { listEl.innerHTML = '<p class="ds-empty" style="padding:.5rem">Nenhum chat encontrado. Envie uma mensagem ao bot e tente novamente.</p>'; }
    else {
      listEl.innerHTML = chats.map((c, i) => '<div class="chat-item" data-cid="' + escapeHtml(c.id) + '"><span class="chat-idx">' + (i + 1) + '</span><span>' + escapeHtml(c.name) + (c.handle ? ' <span class="ds-dim">' + escapeHtml(c.handle) + '</span>' : '') + '</span><span class="ds-dim">' + escapeHtml(c.type) + ' [' + escapeHtml(c.id) + ']</span></div>').join('');
      listEl.onclick = e => { const item = e.target.closest('.chat-item'); if (!item) return; const inp = document.querySelector('#cfg-form input[name="TELEGRAM_CHAT_ID"]'); if (inp) inp.value = item.dataset.cid; listEl.querySelectorAll('.chat-item').forEach(el => el.classList.toggle('sel', el === item)); };
    }
  } catch (err) { listEl.innerHTML = '<p class="ds-empty" style="padding:.5rem">Erro: ' + escapeHtml(err.message) + '</p>'; }
  finally { btn.textContent = 'Descobrir chats Telegram'; btn.disabled = false; }
}

init().catch(console.error);
setInterval(load, 30000);
</script>`;
}
```

- [ ] **Step 6: Point the GET `/` handler at the new render function**

Na `handleAsync`, trocar:
```js
  if (url.pathname === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ADMIN_HTML);
    return;
  }
```
por:
```js
  if (url.pathname === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminHtml(root, siloPath));
    return;
  }
```

- [ ] **Step 7: Run to verify it passes**

Run: `node --test packages/cli/test/serve.test.js`
Expected: PASS (GET / server-rendered + os endpoints intactos).

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/serve.js packages/cli/test/serve.test.js
git commit -m "feat(admin): server-render the dgk admin via homestead-ssr (isomorphic views)"
```

---

### Task 5: Cobertura no ledger + gate de validação final

**Files:**
- Modify: `docs/convergencia-refarm-feedback.md`

- [ ] **Step 1: Registrar a cobertura**

Em `docs/convergencia-refarm-feedback.md`, na "Avaliação de cobertura", adicionar:
```markdown
- `homestead-ssr@0.1.0` — admin do `dgk serve` server-rendered via shell + render
  helpers (cards/tabelas ds), com módulo de views isomórfico reusado no cliente
  (import map → /_hs/render.js) sem duplicação. Sinal isomórfico/naming relayado
  ao refarm (commit `a1afa932`: garantia browser-safe testada+documentada +
  decision-log). ✓
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS (≥361 + novos: consumer contract, admin_views, rotas /_hs, GET / SSR).

- [ ] **Step 3: Smoke do admin (onde possível)**

Run (manual): `dgk serve` e abrir a URL — verificar que o admin renderiza ds-temado, os cards/tabelas aparecem no HTML inicial (view-source), e configurar/remover/descobrir funcionam. (Não automatizado — sem browser headless do admin no `npm test`.)

- [ ] **Step 4: Commit**

```bash
git add docs/convergencia-refarm-feedback.md
git commit -m "docs(convergencia): record homestead-ssr admin consumer coverage"
```

---

## Verificação final (gate de validação)

- [ ] `pnpm test` ≥361 + novos, verde.
- [ ] `grep -n "ADMIN_HTML" packages/cli/src/commands/serve.js` → vazio (template estático removido).
- [ ] GET `/` server-rendered (ds shell + outbox table no HTML inicial; import map; `data-ds-theme`).
- [ ] `/_hs/render.js` e `/_hs/admin_views.js` importáveis.
- [ ] Sem `@refarm.dev/homestead-ssr` no `package.template.json` (Tier 2 / held).
- [ ] Postura mantida: nada publicado; acumula na `develop`.

## Notas / itens deferidos

- **B (admin inteiro SSR):** as interações já usam os helpers servidos; converter
  config/save/remove/discover em POST + re-render no servidor é o próximo passo.
- **Layout residual:** o `<style>` mínimo (config-panel/field/chat-list) fica até o B
  ou até o `ds` cobrir esses widgets.
- **`siloStatus`/`readRateLimits` signatures:** confirmar (na Task 4) que `siloStatus(siloPath)`
  retorna o array de canais e `readRateLimits()` o objeto de limites usados pelas views.

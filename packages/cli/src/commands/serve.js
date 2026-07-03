import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createProcessHandoffSpecFromRunner, runProcessHandoff } from '@refarm.dev/process-handoff';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  siloStatus, loadSilo, saveTokens, removeService,
  SILO_PATH, SERVICES,
} from '../silo.js';
import { createRequire } from 'node:module';
import { documentHtml } from '@refarm.dev/ds/html';
import { channelsHtml, outboxHtml, rateLimitsHtml } from './admin_views.mjs';

const require = createRequire(import.meta.url);
const ADMIN_VIEWS_PATH = fileURLToPath(new URL('./admin_views.mjs', import.meta.url));

async function loadChannels() {
  try { return await import('@aretw0/dgk-channels/contacts'); } catch { return null; }
}

const DEFAULT_PORT = 4322;
const DEFAULT_HOST = '127.0.0.1';
const RATE_LIMITS_PATH = join(homedir(), '.dgk', 'rate-limits.json');

export function parsePort(args) {
  const idx = args.indexOf('--port');
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  return DEFAULT_PORT;
}

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function readOutbox(root) {
  const path = join(root, '.dgk', 'outbox-publicacao.json');
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(data.items) ? data.items : [];
  } catch { return []; }
}

function readRateLimits() {
  if (!existsSync(RATE_LIMITS_PATH)) return {};
  try { return JSON.parse(readFileSync(RATE_LIMITS_PATH, 'utf8')); } catch { return {}; }
}

async function readAllContacts(root, siloPath) {
  const mod = await loadChannels();
  const result = {};
  for (const platform of Object.keys(SERVICES)) {
    if (!mod) { result[platform] = { count: 0, contacts: [] }; continue; }
    const silo = loadSilo(siloPath);
    const dir = mod.resolveContactsDir(root, silo);
    const contacts = mod.loadContacts(platform, dir);
    result[platform] = { count: contacts.length, contacts };
  }
  return result;
}

async function verifyTelegramToken(token, fetchFn) {
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/getMe`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? `@${data.result.username}` : null;
  } catch { return null; }
}

// Launches a script and captures stdout+stderr. Used by operation endpoints
// so Pi can receive the output and relay it back via Telegram.
export async function defaultSpawn(cmd, args, cwd) {
  try {
    const { exitCode, stdout, stderr } = await runProcessHandoff(
      createProcessHandoffSpecFromRunner(cmd, args, { cwd }),
      { capture: true },
    );
    return { ok: exitCode === 0, output: `${stdout}${stderr}`.trim() };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

const ETL_SCRIPTS = [
  'scripts/lab_etl_demo.mjs',
  'scripts/prepare_feed_sources.mjs',
  'scripts/prepare_publication_outbox.mjs',
  'scripts/prepare_lab_datasets.mjs',
];

function readInboxItems(root) {
  const dir = join(root, '00 - Entrada');
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const content = readFileSync(join(dir, f), 'utf8');
        const fm = content.match(/^---\n([\s\S]*?)\n---/);
        const meta = {};
        if (fm) {
          for (const line of fm[1].split('\n')) {
            const sep = line.indexOf(':');
            if (sep < 1) continue;
            meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
          }
        }
        return { file: f, title: meta.title ?? f.replace('.md', ''), status: meta.status, source: meta.source, created: meta.created };
      });
  } catch { return []; }
}

// Returns service metadata (no credentials — just schema for UI form generation).
function servicesMeta() {
  return Object.fromEntries(
    Object.entries(SERVICES).map(([id, s]) => [id, { label: s.label, hint: s.hint, prompts: s.prompts }]),
  );
}

async function fetchTelegramChats(token, fetchFn) {
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.ok) return [];
    const seen = new Map();
    for (const u of data.result ?? []) {
      const chat = u.message?.chat ?? u.channel_post?.chat ??
                   u.my_chat_member?.chat ?? u.chat_member?.chat;
      if (chat && !seen.has(chat.id)) seen.set(chat.id, chat);
    }
    const mod = await loadChannels();
    if (!mod) return [];
    return mod.telegramChatsToContacts([...seen.values()]);
  } catch { return []; }
}

// Admin dashboard HTML — server-rendered via ds/html documentHtml + isomorphic
// admin_views. Tokens never appear in initial HTML; only masked previews from /api/status.
function adminClientScript() {
  return `<script type="module">
import { channelsHtml, outboxHtml, rateLimitsHtml } from "/_hs/admin_views.js";
import { fieldHtml, buttonHtml, escapeHtml } from "@refarm.dev/ds/html";

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
<\/script>`;
}

async function renderAdminHtml(root, siloPath) {
  const channels = await siloStatus(siloPath);
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
{"imports":{"@refarm.dev/ds/html":"/_hs/render.js"}}
<\/script>`;

  const bodyHtml = `${importMap}
${residualCss}
<h1>⬡ dgk admin</h1>
<div id="channels-view">${channelsHtml(channels, null)}</div>
<div id="config-wrap"></div>
<div id="outbox-view">${outboxHtml(items)}</div>
<div id="ratelimits-view">${rateLimitsHtml(limits)}</div>
<footer id="ts" class="ds-footer"></footer>
${adminClientScript()}`;

  return documentHtml({ title: 'dgk admin', theme: 'verde-jardim', assetBase: '/_ds', bodyHtml });
}

async function handleAsync(req, res, root, siloPath, fetchFn, spawnFn) {
  const url = new URL(req.url, 'http://localhost');
  const { method } = req;

  // DNS rebinding: reject requests whose Host doesn't match the local server
  const host = req.headers.host || '';
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
    jsonResponse(res, { error: 'forbidden host' }, 403);
    return;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, POST, DELETE, OPTIONS' });
    res.end();
    return;
  }

  // CSRF: require custom header on all state-changing requests
  if (['POST', 'DELETE'].includes(method) && req.headers['x-dgk-admin'] !== '1') {
    jsonResponse(res, { error: 'missing csrf header' }, 403);
    return;
  }

  if (url.pathname === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await renderAdminHtml(root, siloPath));
    return;
  }

  if (url.pathname === '/api/status' && method === 'GET') {
    jsonResponse(res, { channels: await siloStatus(siloPath) });
    return;
  }

  if (url.pathname === '/api/services' && method === 'GET') {
    jsonResponse(res, { services: servicesMeta() });
    return;
  }

  if (url.pathname === '/api/outbox' && method === 'GET') {
    jsonResponse(res, { items: readOutbox(root) });
    return;
  }

  if (url.pathname === '/api/contacts' && method === 'GET') {
    jsonResponse(res, { platforms: await readAllContacts(root, siloPath) });
    return;
  }

  if (url.pathname === '/api/rate-limits' && method === 'GET') {
    jsonResponse(res, { limits: readRateLimits() });
    return;
  }

  if (url.pathname === '/api/sow' && method === 'POST') {
    const { service, tokens } = await readBody(req);
    if (!service || !tokens || typeof tokens !== 'object') {
      jsonResponse(res, { error: 'service and tokens object required' }, 400);
      return;
    }
    if (!(service in SERVICES)) {
      jsonResponse(res, { error: `Unknown service: ${service}` }, 400);
      return;
    }
    const allowedKeys = SERVICES[service].keys;
    const filtered = Object.fromEntries(
      allowedKeys.filter((k) => k in tokens && tokens[k]).map((k) => [k, tokens[k]]),
    );
    if (service === 'telegram' && filtered.TELEGRAM_BOT_TOKEN) {
      const identity = await verifyTelegramToken(filtered.TELEGRAM_BOT_TOKEN, fetchFn);
      if (identity === null) {
        jsonResponse(res, { error: 'Credenciais inválidas: token Telegram rejeitado' }, 400);
        return;
      }
    }
    await saveTokens(filtered, siloPath);
    const mod = await loadChannels();
    if (mod && service === 'telegram' && filtered.TELEGRAM_BOT_TOKEN) {
      const silo = loadSilo(siloPath);
      const contactsDir = mod.resolveContactsDir(root, silo);
      await mod.discoverAndSaveTelegramContacts(filtered.TELEGRAM_BOT_TOKEN, contactsDir, fetchFn)
        .catch(() => {});
    }
    jsonResponse(res, { ok: true });
    return;
  }

  // Must be checked before the DELETE /api/sow/:service handler below
  if (url.pathname === '/api/sow/telegram/chats' && method === 'POST') {
    const { token } = await readBody(req);
    if (!token?.trim()) {
      jsonResponse(res, { error: 'token required' }, 400);
      return;
    }
    const chats = await fetchTelegramChats(token.trim(), fetchFn);
    jsonResponse(res, { chats });
    return;
  }

  const sowDeleteMatch = url.pathname.match(/^\/api\/sow\/([^/]+)$/);
  if (sowDeleteMatch && method === 'DELETE') {
    const serviceId = sowDeleteMatch[1];
    const removed = await removeService(serviceId, siloPath);
    if (!removed) {
      jsonResponse(res, { error: `Service '${serviceId}' not found or not configured` }, 404);
      return;
    }
    jsonResponse(res, { ok: true });
    return;
  }

  if (url.pathname === '/api/etl' && method === 'POST') {
    let combined = '';
    for (const script of ETL_SCRIPTS) {
      const result = await spawnFn('node', [script], root);
      if (result.output) combined += result.output + '\n';
      if (!result.ok) {
        jsonResponse(res, { ok: false, error: combined.trim() }, 500);
        return;
      }
    }
    jsonResponse(res, { ok: true, output: combined.trim() });
    return;
  }

  if (url.pathname === '/api/outbox' && method === 'POST') {
    const { channel = 'telegram', dryRun = false, limit } = await readBody(req);
    const scriptMap = { telegram: 'scripts/publish_to_telegram.mjs' };
    if (!(channel in scriptMap)) {
      jsonResponse(res, { error: `Canal desconhecido: ${channel}` }, 400);
      return;
    }
    const args = [scriptMap[channel]];
    if (dryRun) args.push('--dry-run');
    if (limit) args.push('--limit', String(limit));
    const result = await spawnFn('node', args, root);
    jsonResponse(res, result.ok ? { ok: true, output: result.output } : { ok: false, error: result.output }, result.ok ? 200 : 500);
    return;
  }

  if (url.pathname === '/api/inbox' && method === 'GET') {
    jsonResponse(res, { items: readInboxItems(root) });
    return;
  }

  if (url.pathname === '/api/inbox/fetch' && method === 'POST') {
    const { channel = 'telegram', limit } = await readBody(req);
    const scriptMap = { telegram: 'scripts/inbox_from_telegram.mjs' };
    if (!(channel in scriptMap)) {
      jsonResponse(res, { error: `Canal desconhecido: ${channel}` }, 400);
      return;
    }
    const args = [scriptMap[channel]];
    if (limit) args.push('--limit', String(limit));
    const result = await spawnFn('node', args, root);
    jsonResponse(res, result.ok ? { ok: true, output: result.output } : { ok: false, error: result.output }, result.ok ? 200 : 500);
    return;
  }

  // Serve the isomorphic admin render modules to the browser. The admin uses an
  // import map so admin_views.js's `@refarm.dev/ds/html` import
  // resolves to /_hs/render.js client-side.
  if (url.pathname === '/_hs/render.js' && method === 'GET') {
    try {
      const file = fileURLToPath(import.meta.resolve('@refarm.dev/ds/html'));
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

  // Serve @refarm.dev/ds CSS (tokens, theme, components) for the admin shell.
  if (url.pathname.startsWith('/_ds/') && method === 'GET') {
    const sub = url.pathname.slice('/_ds/'.length);
    if (sub.includes('..') || !/^[a-z0-9][a-z0-9/_-]*\.css$/i.test(sub)) {
      jsonResponse(res, { error: 'bad asset' }, 400);
      return;
    }
    try {
      const file = require.resolve(`@refarm.dev/ds/${sub}`);
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(readFileSync(file, 'utf8'));
    } catch {
      jsonResponse(res, { error: 'asset not found' }, 404);
    }
    return;
  }

  jsonResponse(res, { error: 'Not found' }, 404);
}

function handleRequest(req, res, root, siloPath, fetchFn, spawnFn) {
  handleAsync(req, res, root, siloPath, fetchFn, spawnFn).catch((err) => {
    if (!res.headersSent) jsonResponse(res, { error: 'Internal error' }, 500);
    console.error('dgk serve:', err.message);
  });
}

export function createAdminServer(root = process.cwd(), siloPath = SILO_PATH, { fetchFn = fetch, spawnFn = defaultSpawn } = {}) {
  return createServer((req, res) => handleRequest(req, res, root, siloPath, fetchFn, spawnFn));
}

export async function serve(args, root = process.cwd(), siloPath = SILO_PATH) {
  const port = parsePort(args);
  const server = createAdminServer(root, siloPath);

  await new Promise((resolve, reject) => {
    server.listen(port, DEFAULT_HOST, () => resolve());
    server.on('error', reject);
  });

  console.log(`dgk admin: http://localhost:${port}`);
  console.log('  Ctrl+C para encerrar.');

  process.on('SIGINT', () => { server.close(() => process.exit(0)); });
  await new Promise(() => {});
}

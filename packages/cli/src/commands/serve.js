import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  siloStatus, loadSilo, saveTokens, removeService,
  SILO_PATH, SERVICES,
} from '../silo.js';
import { loadContacts, resolveContactsDir, telegramChatsToContacts } from '@aretw0/dgk-channels/contacts';

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
  const path = join(root, 'dados', 'lab', 'outbox-publicacao.json');
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

function readAllContacts(root, siloPath) {
  const silo = loadSilo(siloPath);
  const dir = resolveContactsDir(root, silo);
  const result = {};
  for (const platform of Object.keys(SERVICES)) {
    const contacts = loadContacts(platform, dir);
    result[platform] = { count: contacts.length, contacts };
  }
  return result;
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
    return telegramChatsToContacts([...seen.values()]);
  } catch { return []; }
}

// Admin dashboard HTML — no external resources, fully local-first.
// Tokens never appear in initial HTML; only masked previews from /api/status.
// esc() sanitizes all vault-sourced data rendered via innerHTML.
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>dgk admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:1.5rem}
h1{color:#00d4aa;font-size:1.2rem;letter-spacing:.05em;margin-bottom:1.5rem}
h2{color:#7070a0;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;margin:1.5rem 0 .7rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.75rem}
.card{background:#1e1e36;border:1px solid #2e2e4a;border-radius:6px;padding:.9rem;display:flex;flex-direction:column;gap:.5rem}
.card.active{border-color:#00d4aa}
.card-name{font-weight:bold;color:#b0b0d0}
.key-row{font-size:.72rem;color:#606080;display:flex;align-items:center;gap:.4rem}
.ok{color:#00d4aa}.miss{color:#d44}
.card-actions{margin-top:auto;display:flex;gap:.4rem;padding-top:.5rem}
.btn{cursor:pointer;font:inherit;border-radius:4px;border:1px solid;padding:.2em .7em;font-size:.75rem}
.btn-cfg{background:#1a2a3a;border-color:#4080b0;color:#80b0e0}
.btn-cfg:hover{background:#1e344a}
.btn-rm{background:#2a1a1a;border-color:#904040;color:#e08080}
.btn-rm:hover{background:#3a2020}
.config-panel{background:#1c1c34;border:1px solid #00d4aa;border-radius:6px;padding:1.2rem;margin-top:1rem}
.config-panel h3{color:#00d4aa;font-size:.9rem;margin-bottom:.3rem}
.hint{font-size:.75rem;color:#505070;margin-bottom:1rem;line-height:1.5}
.field{margin-bottom:.75rem}
.field label{display:block;font-size:.75rem;color:#8080a0;margin-bottom:.3rem}
.field input{width:100%;background:#141428;border:1px solid #2e2e4a;border-radius:4px;padding:.4em .6em;color:#e0e0e0;font:inherit;font-size:.85rem}
.field input:focus{outline:none;border-color:#4060a0}
.discover-wrap{margin:.5rem 0}
.chat-list{margin-top:.5rem;max-height:180px;overflow-y:auto;border:1px solid #2e2e4a;border-radius:4px}
.chat-item{padding:.4rem .7rem;font-size:.8rem;cursor:pointer;display:flex;gap:.7rem;align-items:baseline}
.chat-item:hover{background:#20203a}
.chat-item.sel{background:#1a3a2a;color:#00d4aa}
.chat-idx{color:#505070;min-width:1.5rem}
.form-actions{display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap}
.btn-save{background:#1a3a2a;border-color:#00d4aa;color:#00d4aa}
.btn-save:hover{background:#1e4432}
.btn-cancel{background:#1e1e2e;border-color:#3e3e5a;color:#808090}
table{width:100%;border-collapse:collapse;font-size:.78rem}
th{text-align:left;padding:.45rem .5rem;color:#505070;border-bottom:1px solid #2a2a3e}
td{padding:.4rem .5rem;border-bottom:1px solid #1e1e30;vertical-align:top}
.dim{color:#484860;font-size:.72rem}
.empty{color:#484860;font-style:italic;padding:.75rem 0}
footer{margin-top:2rem;font-size:.7rem;color:#383858}
</style>
</head>
<body>
<h1>⬡ dgk admin</h1>

<h2>Canais</h2>
<div class="grid" id="channels"></div>
<div id="config-wrap"></div>

<h2>Outbox de publicação</h2>
<div id="outbox"></div>

<h2>Rate limits</h2>
<div id="ratelimits"></div>

<footer id="ts"></footer>

<script>
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}

let svcDefs={};
let activeSvc=null;

async function init(){
  const s=await fetch('/api/services').then(r=>r.json());
  svcDefs=s.services??{};
  await load();
}

async function load(){
  const [st,ob,rl]=await Promise.all([
    fetch('/api/status').then(r=>r.json()),
    fetch('/api/outbox').then(r=>r.json()),
    fetch('/api/rate-limits').then(r=>r.json()),
  ]);

  const chs=document.getElementById('channels');
  chs.innerHTML=st.channels.map(ch=>{
    const hasAny=ch.keys.some(k=>k.configured);
    return \`<div class="card\${activeSvc===ch.id?' active':''}" data-svc="\${esc(ch.id)}">
      <div class="card-name">\${esc(ch.label)}</div>
      \${ch.keys.map(k=>\`<div class="key-row">
        <span class="\${k.configured?'ok':'miss'}">\${k.configured?'✓':'✗'}</span>
        <span>\${esc(k.key)}\${k.preview?\` <span class="dim">\${esc(k.preview)}</span>\`:''}</span>
      </div>\`).join('')}
      <div class="card-actions">
        <button class="btn btn-cfg">Configurar</button>
        \${hasAny?\`<button class="btn btn-rm">Remover</button>\`:''}
      </div>
    </div>\`;
  }).join('');

  // Re-attach event delegation after innerHTML rewrite
  chs.onclick=e=>{
    const btn=e.target.closest('button');
    if(!btn)return;
    const id=btn.closest('[data-svc]')?.dataset.svc;
    if(!id)return;
    if(btn.classList.contains('btn-cfg'))openConfig(id);
    if(btn.classList.contains('btn-rm'))doRemove(id);
  };

  const items=ob.items??[];
  document.getElementById('outbox').innerHTML=items.length?\`<table>
    <tr><th>Nota</th><th>Status</th><th>Canais</th><th class="dim">Data</th></tr>
    \${items.map(it=>\`<tr>
      <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(it.title??it.path)}</td>
      <td>\${esc(it.publicationStatus??it.status)}</td>
      <td>\${(it.channels??[]).map(esc).join(', ')}</td>
      <td class="dim">\${esc((it.collectedAt??'').slice(0,10))}</td>
    </tr>\`).join('')}
  </table>\`:'<p class="empty">Outbox vazio — rode: dgk etl</p>';

  const lims=rl.limits??{};
  const ps=Object.keys(lims);
  document.getElementById('ratelimits').innerHTML=ps.length?\`<table>
    <tr><th>Plataforma</th><th>Último envio</th><th>Enviados (janela)</th></tr>
    \${ps.map(p=>{const d=lims[p];const last=d.lastSentAt?new Date(d.lastSentAt).toLocaleTimeString('pt-BR'):'—';
      return \`<tr><td>\${esc(p)}</td><td>\${esc(last)}</td><td>\${esc(d.sentInWindow??0)}</td></tr>\`;
    }).join('')}
  </table>\`:'<p class="empty">Sem histórico de rate limits ainda.</p>';

  document.getElementById('ts').textContent='Atualizado: '+new Date().toLocaleTimeString('pt-BR');
}

function openConfig(id){
  activeSvc=id;
  const svc=svcDefs[id];
  if(!svc)return;
  const isTelegram=(id==='telegram');
  document.getElementById('config-wrap').innerHTML=\`
    <div class="config-panel">
      <h3>Configurar \${esc(svc.label)}</h3>
      <p class="hint">\${esc(svc.hint)}</p>
      <form id="cfg-form">
        \${svc.prompts.map(p=>\`<div class="field">
          <label>\${esc(p.label)}\${p.secret?' <span class="dim">(deixe em branco para manter)</span>':''}</label>
          <input type="\${p.secret?'password':'text'}" name="\${esc(p.key)}" autocomplete="off" spellcheck="false">
        </div>\`).join('')}
        \${isTelegram?\`<div class="discover-wrap">
          <button type="button" class="btn btn-cfg" id="disc-btn" onclick="discoverChats()">Descobrir chats Telegram</button>
          <div class="chat-list" id="chat-list" hidden></div>
        </div>\`:''}
        <div class="form-actions">
          <button type="submit" class="btn btn-save">Salvar</button>
          <button type="button" class="btn btn-cancel" onclick="closeConfig()">Cancelar</button>
        </div>
      </form>
    </div>\`;

  document.getElementById('cfg-form').onsubmit=saveConfig;
  document.getElementById('config-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});
  // highlight active card
  document.querySelectorAll('.card').forEach(c=>c.classList.toggle('active',c.dataset.svc===id));
}

function closeConfig(){
  activeSvc=null;
  document.getElementById('config-wrap').innerHTML='';
  document.querySelectorAll('.card').forEach(c=>c.classList.remove('active'));
}

async function saveConfig(e){
  e.preventDefault();
  const tokens={};
  for(const[k,v]of new FormData(e.target).entries()){
    if(v.trim())tokens[k]=v.trim();
  }
  const res=await fetch('/api/sow',{method:'POST',headers:{'Content-Type':'application/json','X-Dgk-Admin':'1'},body:JSON.stringify({service:activeSvc,tokens})});
  if(res.ok){closeConfig();await load();}
  else{const d=await res.json();alert('Erro: '+(d.error??'Falha ao salvar'));}
}

async function doRemove(id){
  const label=svcDefs[id]?.label??id;
  if(!confirm('Remover configuração de '+label+'?'))return;
  const res=await fetch('/api/sow/'+id,{method:'DELETE',headers:{'X-Dgk-Admin':'1'}});
  if(res.ok){if(activeSvc===id)closeConfig();await load();}
  else{const d=await res.json();alert('Erro: '+(d.error??'Falha ao remover'));}
}

async function discoverChats(){
  const tokenInput=document.querySelector('#cfg-form input[name="TELEGRAM_BOT_TOKEN"]');
  const token=tokenInput?.value?.trim();
  if(!token){alert('Informe o Bot Token primeiro.');return;}
  const btn=document.getElementById('disc-btn');
  btn.textContent='Descobrindo...';btn.disabled=true;
  const listEl=document.getElementById('chat-list');
  listEl.removeAttribute('hidden');listEl.innerHTML='<div class="empty" style="padding:.5rem">Aguardando...</div>';
  try{
    const res=await fetch('/api/sow/telegram/chats',{method:'POST',headers:{'Content-Type':'application/json','X-Dgk-Admin':'1'},body:JSON.stringify({token})});
    const data=await res.json();
    const chats=data.chats??[];
    if(!chats.length){
      listEl.innerHTML='<p class="empty" style="padding:.5rem">Nenhum chat encontrado. Envie uma mensagem ao bot e tente novamente.</p>';
    }else{
      listEl.innerHTML=chats.map((c,i)=>\`<div class="chat-item" data-cid="\${esc(c.id)}">
        <span class="chat-idx">\${i+1}</span>
        <span>\${esc(c.name)}\${c.handle?\` <span class="dim">\${esc(c.handle)}</span>\`:''}</span>
        <span class="dim">\${esc(c.type)} [\${esc(c.id)}]</span>
      </div>\`).join('');
      listEl.onclick=e=>{
        const item=e.target.closest('.chat-item');
        if(!item)return;
        const cid=item.dataset.cid;
        const inp=document.querySelector('#cfg-form input[name="TELEGRAM_CHAT_ID"]');
        if(inp)inp.value=cid;
        listEl.querySelectorAll('.chat-item').forEach(el=>el.classList.toggle('sel',el===item));
      };
    }
  }catch(err){
    listEl.innerHTML=\`<p class="empty" style="padding:.5rem">Erro: \${esc(err.message)}</p>\`;
  }finally{
    btn.textContent='Descobrir chats Telegram';btn.disabled=false;
  }
}

init().catch(console.error);
setInterval(load,30_000);
</script>
</body>
</html>`;

async function handleAsync(req, res, root, siloPath, fetchFn) {
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
    res.end(ADMIN_HTML);
    return;
  }

  if (url.pathname === '/api/status' && method === 'GET') {
    jsonResponse(res, { channels: siloStatus(siloPath) });
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
    jsonResponse(res, { platforms: readAllContacts(root, siloPath) });
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
    saveTokens(tokens, siloPath);
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
    const removed = removeService(serviceId, siloPath);
    if (!removed) {
      jsonResponse(res, { error: `Service '${serviceId}' not found or not configured` }, 404);
      return;
    }
    jsonResponse(res, { ok: true });
    return;
  }

  jsonResponse(res, { error: 'Not found' }, 404);
}

function handleRequest(req, res, root, siloPath, fetchFn) {
  handleAsync(req, res, root, siloPath, fetchFn).catch((err) => {
    if (!res.headersSent) jsonResponse(res, { error: 'Internal error' }, 500);
    console.error('dgk serve:', err.message);
  });
}

export function createAdminServer(root = process.cwd(), siloPath = SILO_PATH, { fetchFn = fetch } = {}) {
  return createServer((req, res) => handleRequest(req, res, root, siloPath, fetchFn));
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

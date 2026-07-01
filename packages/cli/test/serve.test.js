import { describe, test, beforeEach, afterEach, expect } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { createAdminServer, parsePort, defaultSpawn } from '../src/commands/serve.js';

/** Raw HTTP request allowing custom Host header (fetch() forbids this). */
function rawRequest(address, { path = '/', method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(address);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path, method, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function tempDir() {
  const dir = join(tmpdir(), `serve-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function tempSilo(dir, tokens = {}) {
  const siloPath = join(dir, 'silo.json');
  writeFileSync(siloPath, JSON.stringify({ tokens }), 'utf8');
  return siloPath;
}

/** Binds the server to a free port; returns { address, close }. */
async function startServer(root, siloPath, opts = {}) {
  const server = createAdminServer(root, siloPath, opts);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });
  const { port } = server.address();
  const address = `http://127.0.0.1:${port}`;
  return { address, close: () => new Promise((r) => server.close(r)) };
}

// --- defaultSpawn ---

test('defaultSpawn captura stdout e marca ok em exit 0', async () => {
  const r = await defaultSpawn('node', ['-e', "process.stdout.write('hi')"], process.cwd());
  expect(r.ok).toBe(true);
  expect(r.output).toBe('hi');
});

test('defaultSpawn marca ok=false em exit != 0', async () => {
  const r = await defaultSpawn('node', ['-e', 'process.exit(2)'], process.cwd());
  expect(r.ok).toBe(false);
});

// --- parsePort ---

describe('parsePort', () => {
  test('retorna porta padrão 4322 quando --port não fornecido', () => {
    expect(parsePort([])).toBe(4322);
    expect(parsePort(['--dry-run'])).toBe(4322);
  });

  test('retorna porta personalizada de --port N', () => {
    expect(parsePort(['--port', '8080'])).toBe(8080);
    expect(parsePort(['--port', '5000'])).toBe(5000);
  });
});

// --- API routes ---

describe('GET /api/status', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp, { TELEGRAM_BOT_TOKEN: 'tok-abc123', TELEGRAM_CHAT_ID: '-100' });
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna array de canais', async () => {
    const res = await fetch(`${server.address}/api/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.channels), 'channels deve ser array').toBeTruthy();
    expect(data.channels.length > 0, 'deve ter ao menos um canal').toBeTruthy();
  });

  test('cada canal tem id, label e keys', async () => {
    const res = await fetch(`${server.address}/api/status`);
    const data = await res.json();
    for (const ch of data.channels) {
      expect(ch.id, 'canal deve ter id').toBeTruthy();
      expect(ch.label, 'canal deve ter label').toBeTruthy();
      expect(Array.isArray(ch.keys), 'canal deve ter keys array').toBeTruthy();
    }
  });

  test('canal telegram aparece como configurado quando token presente', async () => {
    const res = await fetch(`${server.address}/api/status`);
    const data = await res.json();
    const telegram = data.channels.find((c) => c.id === 'telegram');
    expect(telegram, 'telegram deve estar listado').toBeTruthy();
    const tokenKey = telegram.keys.find((k) => k.key === 'TELEGRAM_BOT_TOKEN');
    expect(tokenKey.configured, 'TELEGRAM_BOT_TOKEN deve aparecer como configurado').toBeTruthy();
  });
});

describe('GET /api/outbox', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna items vazio quando arquivo não existe', async () => {
    const res = await fetch(`${server.address}/api/outbox`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual([]);
  });

  test('retorna items do arquivo quando presente', async () => {
    const outboxDir = join(tmp, '.dgk');
    mkdirSync(outboxDir, { recursive: true });
    const item = { id: 'nota-1', title: 'Minha Nota', status: 'published', channels: ['mastodon'] };
    writeFileSync(
      join(outboxDir, 'outbox-publicacao.json'),
      JSON.stringify({ schemaVersion: 1, items: [item] }),
      'utf8',
    );
    const res = await fetch(`${server.address}/api/outbox`);
    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].id).toBe('nota-1');
  });
});

describe('GET /api/contacts', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna plataformas com contagem', async () => {
    const res = await fetch(`${server.address}/api/contacts`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.platforms === 'object', 'deve ter platforms').toBeTruthy();
    expect('telegram' in data.platforms, 'telegram deve estar listado').toBeTruthy();
    expect(data.platforms.telegram.count, 'vazio sem contatos salvos').toBe(0);
  });
});

describe('GET /api/rate-limits', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna objeto (vazio se sem histórico)', async () => {
    const res = await fetch(`${server.address}/api/rate-limits`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.limits === 'object', 'deve ter limits').toBeTruthy();
  });
});

describe('GET /', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna HTML com Content-Type text/html', async () => {
    const res = await fetch(`${server.address}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')?.includes('text/html')).toBeTruthy();
    const html = await res.text();
    expect(html.includes('dgk admin'), 'deve conter título da página').toBeTruthy();
  });
});

describe('GET /api/services', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna definições dos canais registrados sem credentials', async () => {
    const res = await fetch(`${server.address}/api/services`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.services === 'object').toBeTruthy();
    expect('telegram' in data.services, 'telegram deve estar listado').toBeTruthy();
    expect(!('mastodon' in data.services), 'mastodon não deve estar listado (ciclo incompleto)').toBeTruthy();
  });

  test('cada serviço tem label, hint e prompts', async () => {
    const res = await fetch(`${server.address}/api/services`);
    const data = await res.json();
    for (const [, svc] of Object.entries(data.services)) {
      expect(svc.label, 'deve ter label').toBeTruthy();
      expect(svc.hint, 'deve ter hint').toBeTruthy();
      expect(Array.isArray(svc.prompts), 'deve ter prompts array').toBeTruthy();
    }
  });

  test('serviços não expõem tokens ou valores sensíveis', async () => {
    const res = await fetch(`${server.address}/api/services`);
    const raw = await res.text();
    expect(!raw.includes('"configured"'), 'services não deve ter campo configured').toBeTruthy();
  });
});

describe('POST /api/sow', () => {
  let tmp, siloPath, server;
  const fakeFetch = async (url) => {
    if (String(url).includes('/getMe')) {
      return { ok: true, json: async () => ({ ok: true, result: { username: 'testbot', first_name: 'Test' } }) };
    }
    return { ok: true, json: async () => ({ ok: true, result: [] }) };
  };
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath, { fetchFn: fakeFetch });
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('salva tokens para serviço conhecido', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram', tokens: { TELEGRAM_BOT_TOKEN: 'tok-test', TELEGRAM_CHAT_ID: '-999' } }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify persisted in silo
    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    expect(silo.tokens.TELEGRAM_BOT_TOKEN).toBe('tok-test');
  });

  test('retorna 400 para serviço fora do ciclo completo (mastodon)', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'mastodon', tokens: { MASTODON_TOKEN: 'tok' } }),
    });
    expect(res.status).toBe(400);
  });

  test('retorna 400 para serviço desconhecido', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'plataforma-inexistente', tokens: { X: 'y' } }),
    });
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando body não tem tokens', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram' }),
    });
    expect(res.status).toBe(400);
  });

  test('não substitui tokens existentes não fornecidos (merge parcial)', async () => {
    const res1 = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram', tokens: { TELEGRAM_BOT_TOKEN: 'tok1', TELEGRAM_CHAT_ID: '-100' } }),
    });
    expect(res1.status).toBe(200);

    const res2 = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram', tokens: { TELEGRAM_BOT_TOKEN: 'tok2' } }),
    });
    expect(res2.status).toBe(200);

    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    expect(silo.tokens.TELEGRAM_BOT_TOKEN, 'token atualizado').toBe('tok2');
    expect(silo.tokens.TELEGRAM_CHAT_ID, 'chat_id preservado').toBe('-100');
  });
});

describe('DELETE /api/sow/:service', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp, { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100' });
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('remove credenciais do serviço', async () => {
    const res = await fetch(`${server.address}/api/sow/telegram`, { method: 'DELETE', headers: { 'X-Dgk-Admin': '1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    expect(!silo.tokens?.TELEGRAM_BOT_TOKEN, 'token deve ter sido removido').toBeTruthy();
  });

  test('retorna 404 para serviço desconhecido (fora do ciclo completo)', async () => {
    const res = await fetch(`${server.address}/api/sow/mastodon`, { method: 'DELETE', headers: { 'X-Dgk-Admin': '1' } });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/sow/telegram/chats', () => {
  let tmp, siloPath;
  beforeEach(() => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
  });
  afterEach(() => rmSync(tmp, { recursive: true }));

  test('retorna lista de chats com fetch mockado', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        result: [
          { update_id: 1, message: { chat: { id: 111, type: 'private', first_name: 'Ana' } } },
          { update_id: 2, channel_post: { chat: { id: -100999, type: 'channel', title: 'Canal', username: 'meucanal' } } },
        ],
      }),
    });
    const server = await startServer(tmp, siloPath, { fetchFn: fakeFetch });
    try {
      const res = await fetch(`${server.address}/api/sow/telegram/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
        body: JSON.stringify({ token: 'fake-bot-token' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.chats)).toBeTruthy();
      expect(data.chats.length).toBe(2);
      const canal = data.chats.find((c) => c.type === 'channel');
      expect(canal, 'deve ter o canal').toBeTruthy();
      expect(canal.handle).toBe('@meucanal');
    } finally {
      await server.close();
    }
  });

  test('retorna [] quando API Telegram falha', async () => {
    const fakeFetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
    const server = await startServer(tmp, siloPath, { fetchFn: fakeFetch });
    try {
      const res = await fetch(`${server.address}/api/sow/telegram/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
        body: JSON.stringify({ token: 'bad-token' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.chats).toEqual([]);
    } finally {
      await server.close();
    }
  });

  test('retorna 400 quando token não fornecido', async () => {
    const server = await startServer(tmp, siloPath);
    try {
      const res = await fetch(`${server.address}/api/sow/telegram/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    } finally {
      await server.close();
    }
  });
});

describe('rota desconhecida', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna 404 com JSON de erro', async () => {
    const res = await fetch(`${server.address}/nao-existe`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

// --- Security: DNS rebinding and CSRF protection ---

describe('Host header validation (DNS rebinding protection)', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('rejeita Host de origem externa com 403', async () => {
    const url = new URL(server.address);
    const r = await rawRequest(server.address, {
      path: '/api/status',
      method: 'GET',
      headers: { host: 'evil.example.com' },
    });
    expect(r.status).toBe(403);
    const data = JSON.parse(r.body);
    expect(data.error).toBeTruthy();
  });

  test('aceita Host 127.0.0.1:<port>', async () => {
    const url = new URL(server.address);
    const r = await rawRequest(server.address, {
      path: '/api/status',
      method: 'GET',
      headers: { host: `127.0.0.1:${url.port}` },
    });
    expect(r.status).toBe(200);
  });

  test('aceita Host localhost:<port>', async () => {
    const url = new URL(server.address);
    const r = await rawRequest(server.address, {
      path: '/api/status',
      method: 'GET',
      headers: { host: `localhost:${url.port}` },
    });
    expect(r.status).toBe(200);
  });
});

describe('CSRF header validation', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('POST sem X-Dgk-Admin retorna 403', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'mastodon', tokens: { MASTODON_TOKEN: 'x' } }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  test('DELETE sem X-Dgk-Admin retorna 403', async () => {
    const siloWithToken = tempSilo(tmp, { MASTODON_TOKEN: 'tok' });
    const s = await startServer(tmp, siloWithToken);
    try {
      const res = await fetch(`${s.address}/api/sow/mastodon`, { method: 'DELETE' });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeTruthy();
    } finally {
      await s.close();
    }
  });

  test('GET não requer X-Dgk-Admin', async () => {
    const res = await fetch(`${server.address}/api/status`);
    expect(res.status).toBe(200);
  });
});

// --- Operation endpoints (ETL, outbox, inbox) ---

function mockSpawn(result) {
  return async (_cmd, _args, _cwd) => result;
}

describe('POST /api/etl', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath, { spawnFn: mockSpawn({ ok: true, output: 'ETL OK' }) });
  });
  afterEach(async () => { await server.close(); rmSync(tmp, { recursive: true }); });

  test('retorna ok=true quando todos os scripts passam', async () => {
    const res = await fetch(`${server.address}/api/etl`, {
      method: 'POST',
      headers: { 'X-Dgk-Admin': '1' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test('retorna 500 e ok=false quando um script falha', async () => {
    const s = await startServer(tmp, siloPath, { spawnFn: mockSpawn({ ok: false, output: 'script error' }) });
    try {
      const res = await fetch(`${s.address}/api/etl`, {
        method: 'POST',
        headers: { 'X-Dgk-Admin': '1' },
      });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBeTruthy();
    } finally { await s.close(); }
  });

  test('requer X-Dgk-Admin', async () => {
    const res = await fetch(`${server.address}/api/etl`, { method: 'POST' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/outbox', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath, { spawnFn: mockSpawn({ ok: true, output: '1 nota publicada' }) });
  });
  afterEach(async () => { await server.close(); rmSync(tmp, { recursive: true }); });

  test('publica no canal telegram com sucesso', async () => {
    const res = await fetch(`${server.address}/api/outbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ channel: 'telegram' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test('retorna 400 para canal desconhecido', async () => {
    const res = await fetch(`${server.address}/api/outbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ channel: 'plataforma-inexistente' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe('GET /api/inbox', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => { await server.close(); rmSync(tmp, { recursive: true }); });

  test('retorna lista vazia quando 00 - Entrada/ não existe', async () => {
    const res = await fetch(`${server.address}/api/inbox`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual([]);
  });

  test('retorna notas do inbox com metadados básicos', async () => {
    const inboxDir = join(tmp, '00 - Entrada');
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, 'nota-teste.md'), [
      '---',
      'title: "Nota de teste"',
      'status: draft',
      'source: telegram',
      '---',
      'Conteúdo aqui.',
    ].join('\n'));

    const res = await fetch(`${server.address}/api/inbox`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].title).toBe('Nota de teste');
    expect(data.items[0].status).toBe('draft');
    expect(data.items[0].source).toBe('telegram');
  });
});

test("GET / is server-rendered with the ds shell and the outbox table", async () => {
  const tmp2 = tempDir();
  const siloPath2 = tempSilo(tmp2);
  mkdirSync(join(tmp2, ".dgk"), { recursive: true });
  writeFileSync(join(tmp2, ".dgk", "outbox-publicacao.json"), JSON.stringify({ items: [{ title: "Nota A", path: "a.md", publicationStatus: "draft", channels: ["rss"], collectedAt: "2026-05-26T00:00:00Z" }] }));
  const server = await startServer(tmp2, siloPath2, {});
  try {
    const html = await fetch(`${server.address}/`).then((r) => r.text());
    expect(html).toMatch(/data-ds-theme="verde-jardim"/);     // ds shell
    expect(html).toMatch(/\/_ds\/themes\/verde-jardim\.css/);  // ds css linked by documentHtml
    expect(html).toMatch(/type="importmap"/);                   // import map present
    expect(html).toMatch(/ds-table/);                           // outbox rendered server-side
    expect(html).toMatch(/Nota A/);                             // the item, in the initial HTML
    expect(html).not.toMatch(/<div id="outbox"><\/div>/);   // not an empty client placeholder
  } finally {
    await server.close();
    rmSync(tmp2, { recursive: true });
  }
});

describe('GET /_hs/render.js and /_hs/admin_views.js', () => {
  let tmp, siloPath;
  beforeEach(() => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
  });
  afterEach(() => rmSync(tmp, { recursive: true }));

  test("serve /_hs/render.js and /_hs/admin_views.js as importable modules", async () => {
    const server = await startServer(tmp, siloPath, {});
    try {
      const base = server.address;
      const r1 = await fetch(`${base}/_hs/render.js`);
      expect(r1.status).toBe(200);
      expect(r1.headers.get("content-type") || "").toMatch(/javascript/);
      expect(await r1.text()).toMatch(/export function cardHtml/);

      const r2 = await fetch(`${base}/_hs/admin_views.js`);
      expect(r2.status).toBe(200);
      const body = await r2.text();
      expect(body).toMatch(/export function channelsHtml/);
      expect(body).toMatch(/@refarm\.dev\/ds\/html/); // bare specifier (import map resolves in browser)
    } finally {
      await server.close();
    }
  });
});

describe('POST /api/inbox/fetch', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp);
    server = await startServer(tmp, siloPath, { spawnFn: mockSpawn({ ok: true, output: '2 update(s) importados' }) });
  });
  afterEach(async () => { await server.close(); rmSync(tmp, { recursive: true }); });

  test('busca mensagens do telegram com sucesso', async () => {
    const res = await fetch(`${server.address}/api/inbox/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ channel: 'telegram' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.output).toBeTruthy();
  });

  test('retorna 400 para canal desconhecido', async () => {
    const res = await fetch(`${server.address}/api/inbox/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ channel: 'whatsapp' }),
    });
    expect(res.status).toBe(400);
  });

  test('requer X-Dgk-Admin', async () => {
    const res = await fetch(`${server.address}/api/inbox/fetch`, {
      method: 'POST',
      body: JSON.stringify({ channel: 'telegram' }),
    });
    expect(res.status).toBe(403);
  });
});

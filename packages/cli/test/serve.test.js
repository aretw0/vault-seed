import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { createAdminServer, parsePort } from '../src/commands/serve.js';

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

// --- parsePort ---

describe('parsePort', () => {
  test('retorna porta padrão 4322 quando --port não fornecido', () => {
    assert.equal(parsePort([]), 4322);
    assert.equal(parsePort(['--dry-run']), 4322);
  });

  test('retorna porta personalizada de --port N', () => {
    assert.equal(parsePort(['--port', '8080']), 8080);
    assert.equal(parsePort(['--port', '5000']), 5000);
  });
});

// --- API routes ---

describe('GET /api/status', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp, { MASTODON_TOKEN: 'tok-abc123' });
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('retorna array de canais', async () => {
    const res = await fetch(`${server.address}/api/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.channels), 'channels deve ser array');
    assert.ok(data.channels.length > 0, 'deve ter ao menos um canal');
  });

  test('cada canal tem id, label e keys', async () => {
    const res = await fetch(`${server.address}/api/status`);
    const data = await res.json();
    for (const ch of data.channels) {
      assert.ok(ch.id, 'canal deve ter id');
      assert.ok(ch.label, 'canal deve ter label');
      assert.ok(Array.isArray(ch.keys), 'canal deve ter keys array');
    }
  });

  test('canal mastodon aparece como configurado quando token presente', async () => {
    const res = await fetch(`${server.address}/api/status`);
    const data = await res.json();
    const mastodon = data.channels.find((c) => c.id === 'mastodon');
    assert.ok(mastodon, 'mastodon deve estar listado');
    const tokenKey = mastodon.keys.find((k) => k.key === 'MASTODON_TOKEN');
    assert.ok(tokenKey.configured, 'MASTODON_TOKEN deve aparecer como configurado');
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
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.items, []);
  });

  test('retorna items do arquivo quando presente', async () => {
    const outboxDir = join(tmp, 'dados', 'lab');
    mkdirSync(outboxDir, { recursive: true });
    const item = { id: 'nota-1', title: 'Minha Nota', status: 'published', channels: ['mastodon'] };
    writeFileSync(
      join(outboxDir, 'outbox-publicacao.json'),
      JSON.stringify({ schemaVersion: 1, items: [item] }),
      'utf8',
    );
    const res = await fetch(`${server.address}/api/outbox`);
    const data = await res.json();
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].id, 'nota-1');
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
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.platforms === 'object', 'deve ter platforms');
    assert.ok('telegram' in data.platforms, 'telegram deve estar listado');
    assert.equal(data.platforms.telegram.count, 0, 'vazio sem contatos salvos');
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
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.limits === 'object', 'deve ter limits');
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
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('dgk admin'), 'deve conter título da página');
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

  test('retorna definições de todos os canais sem credentials', async () => {
    const res = await fetch(`${server.address}/api/services`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.services === 'object');
    assert.ok('telegram' in data.services, 'telegram deve estar listado');
    assert.ok('mastodon' in data.services);
  });

  test('cada serviço tem label, hint e prompts', async () => {
    const res = await fetch(`${server.address}/api/services`);
    const data = await res.json();
    for (const [, svc] of Object.entries(data.services)) {
      assert.ok(svc.label, 'deve ter label');
      assert.ok(svc.hint, 'deve ter hint');
      assert.ok(Array.isArray(svc.prompts), 'deve ter prompts array');
    }
  });

  test('serviços não expõem tokens ou valores sensíveis', async () => {
    const res = await fetch(`${server.address}/api/services`);
    const raw = await res.text();
    assert.ok(!raw.includes('"configured"'), 'services não deve ter campo configured');
  });
});

describe('POST /api/sow', () => {
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

  test('salva tokens para serviço conhecido', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'mastodon', tokens: { MASTODON_TOKEN: 'tok-test' } }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);

    // Verify persisted in silo
    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    assert.equal(silo.tokens.MASTODON_TOKEN, 'tok-test');
  });

  test('retorna 400 para serviço desconhecido', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'plataforma-inexistente', tokens: { X: 'y' } }),
    });
    assert.equal(res.status, 400);
  });

  test('retorna 400 quando body não tem tokens', async () => {
    const res = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram' }),
    });
    assert.equal(res.status, 400);
  });

  test('não substitui tokens existentes não fornecidos (merge parcial)', async () => {
    const res1 = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram', tokens: { TELEGRAM_BOT_TOKEN: 'tok1', TELEGRAM_CHAT_ID: '-100' } }),
    });
    assert.equal(res1.status, 200);

    const res2 = await fetch(`${server.address}/api/sow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dgk-Admin': '1' },
      body: JSON.stringify({ service: 'telegram', tokens: { TELEGRAM_BOT_TOKEN: 'tok2' } }),
    });
    assert.equal(res2.status, 200);

    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    assert.equal(silo.tokens.TELEGRAM_BOT_TOKEN, 'tok2', 'token atualizado');
    assert.equal(silo.tokens.TELEGRAM_CHAT_ID, '-100', 'chat_id preservado');
  });
});

describe('DELETE /api/sow/:service', () => {
  let tmp, siloPath, server;
  beforeEach(async () => {
    tmp = tempDir();
    siloPath = tempSilo(tmp, { MASTODON_TOKEN: 'tok', MASTODON_INSTANCE: 'social.example' });
    server = await startServer(tmp, siloPath);
  });
  afterEach(async () => {
    await server.close();
    rmSync(tmp, { recursive: true });
  });

  test('remove credenciais do serviço', async () => {
    const res = await fetch(`${server.address}/api/sow/mastodon`, { method: 'DELETE', headers: { 'X-Dgk-Admin': '1' } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);

    const { readFileSync } = await import('node:fs');
    const silo = JSON.parse(readFileSync(siloPath, 'utf8'));
    assert.ok(!silo.tokens?.MASTODON_TOKEN, 'token deve ter sido removido');
  });

  test('retorna 404 para serviço não configurado', async () => {
    const res = await fetch(`${server.address}/api/sow/telegram`, { method: 'DELETE', headers: { 'X-Dgk-Admin': '1' } });
    assert.equal(res.status, 404);
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
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.chats));
      assert.equal(data.chats.length, 2);
      const canal = data.chats.find((c) => c.type === 'channel');
      assert.ok(canal, 'deve ter o canal');
      assert.equal(canal.handle, '@meucanal');
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
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.chats, []);
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
      assert.equal(res.status, 400);
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
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
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
    assert.equal(r.status, 403);
    const data = JSON.parse(r.body);
    assert.ok(data.error);
  });

  test('aceita Host 127.0.0.1:<port>', async () => {
    const url = new URL(server.address);
    const r = await rawRequest(server.address, {
      path: '/api/status',
      method: 'GET',
      headers: { host: `127.0.0.1:${url.port}` },
    });
    assert.equal(r.status, 200);
  });

  test('aceita Host localhost:<port>', async () => {
    const url = new URL(server.address);
    const r = await rawRequest(server.address, {
      path: '/api/status',
      method: 'GET',
      headers: { host: `localhost:${url.port}` },
    });
    assert.equal(r.status, 200);
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
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.error);
  });

  test('DELETE sem X-Dgk-Admin retorna 403', async () => {
    const siloWithToken = tempSilo(tmp, { MASTODON_TOKEN: 'tok' });
    const s = await startServer(tmp, siloWithToken);
    try {
      const res = await fetch(`${s.address}/api/sow/mastodon`, { method: 'DELETE' });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error);
    } finally {
      await s.close();
    }
  });

  test('GET não requer X-Dgk-Admin', async () => {
    const res = await fetch(`${server.address}/api/status`);
    assert.equal(res.status, 200);
  });
});

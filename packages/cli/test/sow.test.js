import { describe, test, expect } from "vitest";
import { verifyTelegram, discoverTelegramChats, chatLabel, promptSecret, maskSecret, verifyMastodon, normalizeMastodonInstance, verifyBluesky, verifyButtondown } from '../src/commands/sow.js';

function mockFetch(body, ok = true) {
  return async (_url) => ({
    ok,
    json: async () => body,
  });
}

// --- maskSecret ---

describe('maskSecret', () => {
  test('mascara tudo quando valor ≤ tail', () => {
    expect(maskSecret('ab')).toBe('**');
    expect(maskSecret('abcd')).toBe('****');
  });

  test('expõe últimos 4 chars e mascara o restante', () => {
    expect(maskSecret('ABCDEFGHIJ')).toBe('******GHIJ');
  });

  test('comprimento de estrelas é proporcional ao token', () => {
    const result = maskSecret('A'.repeat(20));
    expect(result.length).toBe(20);
    expect(result.startsWith('****************')).toBeTruthy();
    expect(result.endsWith('AAAA')).toBeTruthy();
  });
});

// --- promptSecret ---

describe('promptSecret', () => {
  function mockRlFactory(answer) {
    return () => ({
      question: (_q, cb) => cb(answer),
      close: () => {},
    });
  }

  test('retorna o valor completo não mascarado', async () => {
    const written = [];
    const result = await promptSecret('Token: ', (s) => written.push(s), mockRlFactory('meu-token-secreto-1234'));
    expect(result).toBe('meu-token-secreto-1234');
  });

  test('exibe * proporcionais + últimos 4 chars para tokens longos', async () => {
    const written = [];
    await promptSecret('Token: ', (s) => written.push(s), mockRlFactory('ABCDEFGHIJKLMNOPQRSTUVWX'));
    const feedback = written.find((s) => s.includes('*'));
    expect(feedback, 'deve exibir feedback mascarado').toBeTruthy();
    expect(feedback.includes('UVWX'), 'deve expor os últimos 4 chars').toBeTruthy();
    expect(!feedback.includes('ABCDEFGHIJKLMNOPQRST'), 'não deve expor chars do meio').toBeTruthy();
  });

  test('não expõe chars além do tail para tokens longos', async () => {
    const written = [];
    await promptSecret('Token: ', (s) => written.push(s), mockRlFactory('secreto-completo-1234'));
    const allWritten = written.join('');
    expect(!allWritten.includes('secreto-completo'), 'não deve expor o meio do token').toBeTruthy();
  });

  test('exibe apenas * sem tail para tokens curtos (≤ 4 chars)', async () => {
    const written = [];
    await promptSecret('Token: ', (s) => written.push(s), mockRlFactory('ab'));
    const feedback = written.find((s) => s.includes('*'));
    expect(feedback, 'deve exibir estrelas').toBeTruthy();
    expect(!feedback.includes('ab'), 'não deve expor token curto').toBeTruthy();
  });

  test('escreve a pergunta antes de aguardar input', async () => {
    const written = [];
    await promptSecret('Bot Token: ', (s) => written.push(s), mockRlFactory('tok'));
    expect(written[0], 'a pergunta deve ser a primeira coisa escrita').toBe('Bot Token: ');
  });
});

// --- chatLabel ---

describe('chatLabel', () => {
  test('canal com username', () => {
    const label = chatLabel({ id: -100123, type: 'channel', title: 'Meu Canal', username: 'meucanal' });
    expect(label.includes('Meu Canal'), 'deve incluir o título').toBeTruthy();
    expect(label.includes('@meucanal'), 'deve incluir o username').toBeTruthy();
    expect(label.includes('canal'), 'deve indicar o tipo').toBeTruthy();
    expect(label.includes('-100123'), 'deve incluir o id').toBeTruthy();
  });

  test('grupo sem username', () => {
    const label = chatLabel({ id: -999, type: 'group', title: 'Dev Team' });
    expect(label.includes('Dev Team')).toBeTruthy();
    expect(label.includes('grupo')).toBeTruthy();
    expect(!label.includes('@'), 'não deve ter @ sem username').toBeTruthy();
  });

  test('privado com first_name', () => {
    const label = chatLabel({ id: 42, type: 'private', first_name: 'João', username: 'joaodev' });
    expect(label.includes('João')).toBeTruthy();
    expect(label.includes('privado')).toBeTruthy();
  });

  test('supergrupo mapeia para "supergrupo"', () => {
    const label = chatLabel({ id: -200, type: 'supergroup', title: 'Super Grupo' });
    expect(label.includes('supergrupo')).toBeTruthy();
  });
});

// --- verifyTelegram ---

describe('verifyTelegram', () => {
  test('retorna @username (nome) quando token válido', async () => {
    const fakeFetch = mockFetch({ ok: true, result: { username: 'meubot', first_name: 'Meu Bot' } });
    const result = await verifyTelegram('tok123', fakeFetch);
    expect(result).toBe('@meubot (Meu Bot)');
  });

  test('retorna null quando API retorna ok=false', async () => {
    const fakeFetch = mockFetch({ ok: false, description: 'Unauthorized' });
    const result = await verifyTelegram('tok-invalido', fakeFetch);
    expect(result).toBe(null);
  });

  test('retorna null quando fetch falha com exceção', async () => {
    const fakeFetch = async () => { throw new Error('network error'); };
    const result = await verifyTelegram('tok', fakeFetch);
    expect(result).toBe(null);
  });

  test('retorna null quando resposta HTTP não está ok', async () => {
    const fakeFetch = mockFetch({ ok: false }, false);
    const result = await verifyTelegram('tok', fakeFetch);
    expect(result).toBe(null);
  });
});

// --- discoverTelegramChats ---

describe('discoverTelegramChats', () => {
  test('retorna lista de chats únicos de updates', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, message: { chat: { id: 111, type: 'private', first_name: 'Alice' } } },
        { update_id: 2, message: { chat: { id: 222, type: 'group', title: 'Dev Team' } } },
        { update_id: 3, message: { chat: { id: 111, type: 'private', first_name: 'Alice' } } }, // duplicado
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats.length, 'deve deduplicar por id').toBe(2);
    expect(chats.some((c) => c.id === 111)).toBeTruthy();
    expect(chats.some((c) => c.id === 222)).toBeTruthy();
  });

  test('extrai chats de channel_post', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, channel_post: { chat: { id: -100999, type: 'channel', title: 'Canal Teste' } } },
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats.length).toBe(1);
    expect(chats[0].id).toBe(-100999);
  });

  test('extrai chats de my_chat_member', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, my_chat_member: { chat: { id: -555, type: 'supergroup', title: 'Super Grupo' } } },
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats.length).toBe(1);
    expect(chats[0].title).toBe('Super Grupo');
  });

  test('retorna [] quando API retorna ok=false', async () => {
    const fakeFetch = mockFetch({ ok: false });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats).toEqual([]);
  });

  test('retorna [] quando não há updates', async () => {
    const fakeFetch = mockFetch({ ok: true, result: [] });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats).toEqual([]);
  });

  test('retorna [] quando fetch lança exceção', async () => {
    const fakeFetch = async () => { throw new Error('network'); };
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats).toEqual([]);
  });

  test('ignora updates sem chat (ex: inline_query)', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, inline_query: { id: 'abc', from: { id: 42 }, query: 'test' } },
        { update_id: 2, message: { chat: { id: 77, type: 'private', first_name: 'Bob' } } },
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    expect(chats.length).toBe(1);
    expect(chats[0].id).toBe(77);
  });
});

// --- normalizeMastodonInstance ---

describe('normalizeMastodonInstance', () => {
  test('mantém instância sem protocolo', () => {
    expect(normalizeMastodonInstance('mastodon.social')).toBe('mastodon.social');
  });
  test('remove prefixo https://', () => {
    expect(normalizeMastodonInstance('https://mastodon.social')).toBe('mastodon.social');
  });
  test('remove prefixo http://', () => {
    expect(normalizeMastodonInstance('http://fosstodon.org')).toBe('fosstodon.org');
  });
  test('remove barra final', () => {
    expect(normalizeMastodonInstance('mastodon.social/')).toBe('mastodon.social');
  });
  test('remove protocolo e barra juntos', () => {
    expect(normalizeMastodonInstance('https://mastodon.social/')).toBe('mastodon.social');
  });
  test('retorna string vazia para input vazio (Enter sem digitar)', () => {
    expect(normalizeMastodonInstance('')).toBe('');
  });
  test('retorna string vazia para protocolo sem host', () => {
    expect(normalizeMastodonInstance('https://')).toBe('');
  });
});

// --- verifyMastodon ---

describe('verifyMastodon', () => {
  test('retorna @user@instance quando credenciais são válidas', async () => {
    const fetch = mockFetch({ acct: 'jardineiro' });
    const result = await verifyMastodon('mastodon.social', 'token-valido', fetch);
    expect(result).toBe('@jardineiro@mastodon.social');
  });

  test('retorna null quando resposta não é ok', async () => {
    const fetch = mockFetch({}, false);
    const result = await verifyMastodon('mastodon.social', 'token-invalido', fetch);
    expect(result).toBe(null);
  });

  test('retorna null quando acct está ausente na resposta', async () => {
    const fetch = mockFetch({ id: '123' });
    const result = await verifyMastodon('mastodon.social', 'token', fetch);
    expect(result).toBe(null);
  });

  test('retorna null em caso de erro de rede', async () => {
    const fetch = async () => { throw new Error('Network error'); };
    const result = await verifyMastodon('mastodon.social', 'token', fetch);
    expect(result).toBe(null);
  });
});

// --- verifyBluesky ---

describe('verifyBluesky', () => {
  test('retorna @handle quando credenciais são válidas', async () => {
    const fetch = mockFetch({ handle: 'jardineiro.bsky.social', accessJwt: 'jwt' });
    const result = await verifyBluesky('jardineiro.bsky.social', 'app-password', fetch);
    expect(result).toBe('@jardineiro.bsky.social');
  });

  test('retorna null quando resposta não é ok', async () => {
    const fetch = mockFetch({}, false);
    const result = await verifyBluesky('jardineiro.bsky.social', 'senha-errada', fetch);
    expect(result).toBe(null);
  });

  test('retorna null quando handle está ausente na resposta', async () => {
    const fetch = mockFetch({ did: 'did:plc:123' });
    const result = await verifyBluesky('handle', 'pass', fetch);
    expect(result).toBe(null);
  });

  test('retorna null em caso de erro de rede', async () => {
    const fetch = async () => { throw new Error('Network error'); };
    const result = await verifyBluesky('handle', 'pass', fetch);
    expect(result).toBe(null);
  });

  test('usa método POST e Content-Type corretos', async () => {
    let capturedInit;
    const fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({ handle: 'test.bsky.social' }) };
    };
    await verifyBluesky('test.bsky.social', 'pass', fetch);
    expect(capturedInit.method).toBe('POST');
    expect(capturedInit.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(capturedInit.body);
    expect(body.identifier).toBe('test.bsky.social');
    expect(body.password).toBe('pass');
  });
});

// --- verifyButtondown ---

describe('verifyButtondown', () => {
  test('retorna string de confirmação quando API key é válida', async () => {
    const fetch = mockFetch({ results: [] });
    const result = await verifyButtondown('api-key-valida', fetch);
    expect(result).toBe('(conta verificada)');
  });

  test('retorna null quando resposta não é ok (401)', async () => {
    const fetch = mockFetch({}, false);
    const result = await verifyButtondown('api-key-invalida', fetch);
    expect(result).toBe(null);
  });

  test('retorna null em caso de erro de rede', async () => {
    const fetch = async () => { throw new Error('Network error'); };
    const result = await verifyButtondown('key', fetch);
    expect(result).toBe(null);
  });

  test('usa header Authorization: Token correto', async () => {
    let capturedHeaders;
    const fetch = async (_url, init) => {
      capturedHeaders = init.headers;
      return { ok: true, json: async () => ({}) };
    };
    await verifyButtondown('minha-key-123', fetch);
    expect(capturedHeaders.Authorization).toBe('Token minha-key-123');
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTelegram, discoverTelegramChats, chatLabel, promptSecret } from '../src/commands/sow.js';

function mockFetch(body, ok = true) {
  return async (_url) => ({
    ok,
    json: async () => body,
  });
}

// --- promptSecret ---

describe('promptSecret', () => {
  function mockRl(answer) {
    const written = [];
    const rl = {
      _writeToOutput: null,
      output: { write: (s) => written.push(s) },
      question: (_q, cb) => cb(answer),
    };
    return { rl, written };
  }

  test('retorna o valor completo não mascarado', async () => {
    const { rl, written } = mockRl('meu-token-secreto-1234');
    const result = await promptSecret(rl, 'Token: ', (s) => written.push(s));
    assert.equal(result, 'meu-token-secreto-1234');
  });

  test('exibe 8 pontos + últimos 4 chars para tokens longos', async () => {
    const { rl, written } = mockRl('ABCDEFGHIJKLMNOPQRSTUVWX');
    await promptSecret(rl, 'Token: ', (s) => written.push(s));
    const feedback = written.find((s) => s.includes('•'));
    assert.ok(feedback, 'deve exibir feedback mascarado');
    assert.ok(feedback.includes('••••••••'), 'deve ter 8 pontos');
    assert.ok(feedback.includes('UVWX'), 'deve expor os últimos 4 chars');
  });

  test('não expõe chars intermediários para tokens longos', async () => {
    const { rl, written } = mockRl('secreto-completo-1234');
    await promptSecret(rl, 'Token: ', (s) => written.push(s));
    const allWritten = written.join('');
    assert.ok(!allWritten.includes('secreto-completo'), 'não deve expor o meio do token');
  });

  test('exibe apenas pontos sem tail para tokens curtos (≤ 4 chars)', async () => {
    const { rl, written } = mockRl('ab');
    await promptSecret(rl, 'Token: ', (s) => written.push(s));
    const feedback = written.find((s) => s.includes('•'));
    assert.ok(feedback, 'deve exibir pontos');
    assert.ok(!feedback.includes('ab'), 'não deve expor token curto');
  });

  test('restaura _writeToOutput após a entrada', async () => {
    const { rl } = mockRl('qualquer');
    const originalWrite = (s) => s;
    rl._writeToOutput = originalWrite;
    await promptSecret(rl, 'Token: ', () => {});
    assert.notEqual(rl._writeToOutput, null, '_writeToOutput deve ter sido restaurado');
  });
});

// --- chatLabel ---

describe('chatLabel', () => {
  test('canal com username', () => {
    const label = chatLabel({ id: -100123, type: 'channel', title: 'Meu Canal', username: 'meucanal' });
    assert.ok(label.includes('Meu Canal'), 'deve incluir o título');
    assert.ok(label.includes('@meucanal'), 'deve incluir o username');
    assert.ok(label.includes('canal'), 'deve indicar o tipo');
    assert.ok(label.includes('-100123'), 'deve incluir o id');
  });

  test('grupo sem username', () => {
    const label = chatLabel({ id: -999, type: 'group', title: 'Dev Team' });
    assert.ok(label.includes('Dev Team'));
    assert.ok(label.includes('grupo'));
    assert.ok(!label.includes('@'), 'não deve ter @ sem username');
  });

  test('privado com first_name', () => {
    const label = chatLabel({ id: 42, type: 'private', first_name: 'João', username: 'joaodev' });
    assert.ok(label.includes('João'));
    assert.ok(label.includes('privado'));
  });

  test('supergrupo mapeia para "supergrupo"', () => {
    const label = chatLabel({ id: -200, type: 'supergroup', title: 'Super Grupo' });
    assert.ok(label.includes('supergrupo'));
  });
});

// --- verifyTelegram ---

describe('verifyTelegram', () => {
  test('retorna @username (nome) quando token válido', async () => {
    const fakeFetch = mockFetch({ ok: true, result: { username: 'meubot', first_name: 'Meu Bot' } });
    const result = await verifyTelegram('tok123', fakeFetch);
    assert.equal(result, '@meubot (Meu Bot)');
  });

  test('retorna null quando API retorna ok=false', async () => {
    const fakeFetch = mockFetch({ ok: false, description: 'Unauthorized' });
    const result = await verifyTelegram('tok-invalido', fakeFetch);
    assert.equal(result, null);
  });

  test('retorna null quando fetch falha com exceção', async () => {
    const fakeFetch = async () => { throw new Error('network error'); };
    const result = await verifyTelegram('tok', fakeFetch);
    assert.equal(result, null);
  });

  test('retorna null quando resposta HTTP não está ok', async () => {
    const fakeFetch = mockFetch({ ok: false }, false);
    const result = await verifyTelegram('tok', fakeFetch);
    assert.equal(result, null);
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
    assert.equal(chats.length, 2, 'deve deduplicar por id');
    assert.ok(chats.some((c) => c.id === 111));
    assert.ok(chats.some((c) => c.id === 222));
  });

  test('extrai chats de channel_post', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, channel_post: { chat: { id: -100999, type: 'channel', title: 'Canal Teste' } } },
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    assert.equal(chats.length, 1);
    assert.equal(chats[0].id, -100999);
  });

  test('extrai chats de my_chat_member', async () => {
    const fakeFetch = mockFetch({
      ok: true,
      result: [
        { update_id: 1, my_chat_member: { chat: { id: -555, type: 'supergroup', title: 'Super Grupo' } } },
      ],
    });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    assert.equal(chats.length, 1);
    assert.equal(chats[0].title, 'Super Grupo');
  });

  test('retorna [] quando API retorna ok=false', async () => {
    const fakeFetch = mockFetch({ ok: false });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    assert.deepEqual(chats, []);
  });

  test('retorna [] quando não há updates', async () => {
    const fakeFetch = mockFetch({ ok: true, result: [] });
    const chats = await discoverTelegramChats('tok', fakeFetch);
    assert.deepEqual(chats, []);
  });

  test('retorna [] quando fetch lança exceção', async () => {
    const fakeFetch = async () => { throw new Error('network'); };
    const chats = await discoverTelegramChats('tok', fakeFetch);
    assert.deepEqual(chats, []);
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
    assert.equal(chats.length, 1);
    assert.equal(chats[0].id, 77);
  });
});

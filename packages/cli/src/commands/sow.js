import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { SERVICES, SILO_PATH, saveTokens, removeService, siloStatus, loadSilo } from '../silo.js';

function prompt(question, rlFactory = createInterface) {
  return new Promise((resolve) => {
    const rl = rlFactory({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// TTY path: raw mode + '*' per keypress; on Enter shows '••••••••tail' on next line.
// Non-TTY path (tests, piped input): muted readline with same tail feedback.
export function promptSecret(question, writeFn = (s) => process.stdout.write(s), rlFactory = createInterface) {
  return new Promise((resolve) => {
    writeFn(question);

    if (process.stdin.isTTY) {
      const wasRaw = process.stdin.isRaw;
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      let value = '';
      let done = false;

      const onData = (chunk) => {
        if (done) return;
        // Iterate char-by-char so paste bursts and \r\n pairs are handled uniformly
        for (const char of chunk) {
          if (done) break;
          const code = char.charCodeAt(0);
          if (char === '\r' || char === '\n') {
            done = true;
            process.stdin.setRawMode(wasRaw ?? false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            const tail = value.length > 4 ? value.slice(-4) : '';
            const dots = '•'.repeat(value.length > 4 ? 8 : value.length);
            writeFn(`${dots}${tail}\n`);
            resolve(value);
          } else if (char === '') { // Ctrl+C
            done = true;
            process.stdin.setRawMode(wasRaw ?? false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            writeFn('\n');
            process.exit(130);
          } else if (char === '' || char === '\b') { // backspace
            if (value.length > 0) {
              value = value.slice(0, -1);
              process.stdout.write('\b \b');
            }
          } else if (code >= 32 && code !== 127) { // printable
            value += char;
            process.stdout.write('*');
          }
        }
      };

      process.stdin.on('data', onData);
    } else {
      // Non-TTY: muted readline (tests / piped input)
      const muted = new Writable({ write(_c, _e, cb) { cb(); } });
      const rl = rlFactory({ input: process.stdin, output: muted, terminal: false });
      rl.question(question, (answer) => {
        rl.close();
        const tail = answer.length > 4 ? answer.slice(-4) : '';
        const dots = '•'.repeat(answer.length > 4 ? 8 : answer.length);
        writeFn(`${dots}${tail}\n`);
        resolve(answer);
      });
    }
  });
}

async function verifyMastodon(instance, token) {
  const { request: _req, urlopen: _urlopen } = await import('node:http').catch(() => ({}));
  try {
    const url = `https://${instance}/api/v1/accounts/verify_credentials`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.acct ? `@${data.acct}@${instance}` : null;
  } catch {
    return null;
  }
}

async function verifyBluesky(handle, password) {
  try {
    const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.handle ? `@${data.handle}` : null;
  } catch {
    return null;
  }
}

export async function verifyTelegram(token, fetchFn = fetch) {
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/getMe`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? `@${data.result.username} (${data.result.first_name})` : null;
  } catch {
    return null;
  }
}

export async function discoverTelegramChats(token, fetchFn = fetch) {
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.ok) return [];
    const seen = new Map();
    for (const update of data.result ?? []) {
      const chat =
        update.message?.chat ??
        update.channel_post?.chat ??
        update.my_chat_member?.chat ??
        update.chat_member?.chat;
      if (chat && !seen.has(chat.id)) seen.set(chat.id, chat);
    }
    return [...seen.values()];
  } catch {
    return [];
  }
}

export function chatLabel(chat) {
  const typeMap = { private: 'privado', group: 'grupo', supergroup: 'supergrupo', channel: 'canal' };
  const kind = typeMap[chat.type] ?? chat.type;
  const name = chat.title ?? chat.first_name ?? chat.username ?? String(chat.id);
  const handle = chat.username ? ` (@${chat.username})` : '';
  return `${name}${handle} — ${kind}  [id: ${chat.id}]`;
}

async function resolveTelegramChatId(token) {
  process.stdout.write('  Buscando chats recentes do bot... ');
  const chats = await discoverTelegramChats(token);

  if (!chats.length) {
    console.log('nenhum encontrado.');
    console.log('  Envie qualquer mensagem ao bot e rode `dgk sow telegram` novamente,');
    console.log('  ou informe o Chat ID manualmente (ex: -1001234567890 para canais).\n');
    const raw = await prompt('Chat ID (manual): ');
    return raw.trim();
  }

  console.log(`${chats.length} encontrado(s):\n`);
  chats.forEach((c, i) => console.log(`    [${i + 1}] ${chatLabel(c)}`));
  console.log('');

  const answer = await prompt(`Chat ID (número da lista ou ID manual): `);
  const idx = parseInt(answer.trim(), 10);
  if (!isNaN(idx) && idx >= 1 && idx <= chats.length) {
    const chosen = chats[idx - 1];
    console.log(`  → ${chatLabel(chosen)}`);
    return String(chosen.id);
  }
  return answer.trim();
}

async function sowService(serviceId) {
  if (!process.stdin.isTTY) {
    console.error('dgk sow: requer terminal interativo');
    process.exit(1);
  }

  const service = SERVICES[serviceId];
  if (!service) {
    console.error(`dgk sow: serviço desconhecido '${serviceId}'`);
    console.error(`Serviços disponíveis: ${Object.keys(SERVICES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\nConfigurar ${service.label}`);
  if (service.hint) console.log(`  ${service.hint}`);
  console.log('');

  const collected = {};

  for (const p of service.prompts) {
    if (serviceId === 'telegram' && p.key === 'TELEGRAM_CHAT_ID') {
      collected[p.key] = await resolveTelegramChatId(collected.TELEGRAM_BOT_TOKEN);
    } else if (p.secret) {
      const answer = await promptSecret(`${p.label}: `);
      collected[p.key] = answer.trim();
    } else {
      const answer = await prompt(`${p.label}: `);
      collected[p.key] = answer.trim();
    }
  }

  if (Object.values(collected).some((v) => !v)) {
    console.error('\nErro: todos os campos são obrigatórios.');
    process.exit(1);
  }

  process.stdout.write('\nVerificando credenciais... ');

  let identity = null;
  if (serviceId === 'mastodon') {
    identity = await verifyMastodon(collected.MASTODON_INSTANCE, collected.MASTODON_TOKEN);
  } else if (serviceId === 'bluesky') {
    identity = await verifyBluesky(collected.BLUESKY_HANDLE, collected.BLUESKY_APP_PASSWORD);
  } else if (serviceId === 'telegram') {
    identity = await verifyTelegram(collected.TELEGRAM_BOT_TOKEN);
  } else {
    identity = '(não verificado automaticamente)';
  }

  if (identity === null) {
    console.log('falhou.');
    console.error('Credenciais inválidas — token não salvo.');
    process.exit(1);
  }

  console.log(`${identity}`);
  saveTokens(collected);
  console.log(`✓ Salvo em ${SILO_PATH}\n`);

  if (serviceId === 'telegram') {
    await saveTelegramContacts(collected.TELEGRAM_BOT_TOKEN);
  }
}

async function saveTelegramContacts(token) {
  try {
    const { resolveContactsDir, discoverAndSaveTelegramContacts } =
      await import('@aretw0/dgk-channels/contacts');
    const silo = loadSilo();
    const contactsDir = resolveContactsDir(process.cwd(), silo);
    const saved = await discoverAndSaveTelegramContacts(token, contactsDir);
    if (saved.length) {
      console.log(`  ${saved.length} chat(s) salvos em ${contactsDir}`);
    }
  } catch {
    // dgk-channels not available — no-op
  }
}

function sowList() {
  const status = siloStatus();
  console.log(`\nServiços configurados em ${SILO_PATH}:\n`);
  for (const svc of status) {
    const allConfigured = svc.keys.every((k) => k.configured);
    const marker = allConfigured ? '✓' : '○';
    console.log(`  ${marker} ${svc.label.padEnd(12)}`);
    for (const k of svc.keys) {
      const val = k.configured ? k.preview : '(não configurado)';
      console.log(`      ${k.key.padEnd(26)} ${val}`);
    }
  }
  console.log('');
}

async function sowRemove(serviceId) {
  if (!serviceId) {
    console.error('dgk sow remove: especifique o serviço');
    process.exit(1);
  }
  const removed = removeService(serviceId);
  if (!removed) {
    console.error(`dgk sow remove: serviço desconhecido '${serviceId}'`);
    process.exit(1);
  }
  console.log(`✓ Credenciais de ${serviceId} removidas de ${SILO_PATH}`);
}

export async function sow(args) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === 'list') return sowList();
  if (subcommand === 'remove') return sowRemove(rest[0]);
  return sowService(subcommand);
}

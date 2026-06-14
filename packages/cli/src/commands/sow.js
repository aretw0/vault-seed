import readline from 'node:readline';
import { Writable } from 'node:stream';
import { SERVICES, SILO_PATH, saveTokens, removeService, siloStatus, loadSilo } from '../silo.js';

function prompt(question, rlFactory = readline.createInterface) {
  return new Promise((resolve) => {
    const rl = rlFactory({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// keypress detection: readline.emitKeypressEvents + 'keypress' (named keys, no \r/\n ambiguity)
// line redraw: \r + space-padding — readline.clearLine/cursorTo use ANSI that PowerShell ignores
// maskSecret: proportional '*' per char + last 4 chars visible (refarm pattern)
// Non-TTY fallback: muted readline (tests / piped input).
export function maskSecret(value, visibleTail = 4) {
  if (value.length <= visibleTail) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visibleTail) + value.slice(-visibleTail);
}

export function promptSecret(question, writeFn = (s) => process.stdout.write(s), rlFactory = readline.createInterface) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;

    if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
      // Non-TTY: muted readline (tests / piped input)
      const muted = new Writable({ write(_c, _e, cb) { cb(); } });
      const rl = rlFactory({ input, output: muted, terminal: false });
      writeFn(question);
      rl.question(question, (answer) => {
        rl.close();
        writeFn(`${maskSecret(answer)}\n`);
        resolve(answer);
      });
      return;
    }

    let value = '';
    let lastLen = 0;
    let renderTimer = null;
    const wasRaw = input.isRaw;

    // \r returns cursor to col 0; space-padding overwrites chars left from a
    // longer previous render (e.g. after backspace). Works on any terminal, no ANSI.
    const render = () => {
      const content = `${question}${maskSecret(value)}`;
      const pad = lastLen > content.length ? ' '.repeat(lastLen - content.length) : '';
      lastLen = Math.max(lastLen, content.length);
      output.write(`\r${content}${pad}`);
    };

    // Debounce renders via setImmediate: during a paste burst all keypress events
    // fire synchronously, so only one render fires after the burst ends. Typing
    // feels instant because setImmediate fires before the next I/O event.
    const scheduleRender = () => {
      if (renderTimer) clearImmediate(renderTimer);
      renderTimer = setImmediate(() => { renderTimer = null; render(); });
    };

    const cleanup = () => {
      if (renderTimer) { clearImmediate(renderTimer); renderTimer = null; render(); }
      input.off('keypress', onKeypress);
      input.setRawMode(wasRaw ?? false);
      output.write('\n');
      // unref allows the process to exit naturally after the last prompt;
      // the next promptSecret/prompt call will re-ref via resume().
      input.unref();
    };

    const onKeypress = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === 'backspace') {
        value = value.slice(0, -1);
        scheduleRender();
        return;
      }
      if (!key.ctrl && !key.meta && str) {
        value += str;
        scheduleRender();
      }
    };

    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKeypress);
    render();
  });
}

// Strips protocol and trailing slash so users can paste either
// "mastodon.social" or "https://mastodon.social/" and get the same result.
export function normalizeMastodonInstance(raw) {
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
}

export async function verifyMastodon(instance, token, fetchFn = fetch) {
  try {
    const url = `https://${instance}/api/v1/accounts/verify_credentials`;
    const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.acct ? `@${data.acct}@${instance}` : null;
  } catch {
    return null;
  }
}

export async function verifyBluesky(handle, password, fetchFn = fetch) {
  try {
    const res = await fetchFn('https://bsky.social/xrpc/com.atproto.server.createSession', {
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

export async function verifyButtondown(apiKey, fetchFn = fetch) {
  try {
    const res = await fetchFn('https://api.buttondown.email/v1/emails', {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) return null;
    return '(conta verificada)';
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
    } else if (serviceId === 'mastodon' && p.key === 'MASTODON_TOKEN') {
      // Instance is already collected — show the real app-creation link before asking for token.
      const instance = normalizeMastodonInstance(collected.MASTODON_INSTANCE);
      if (!instance) {
        console.error('\nErro: instância Mastodon é obrigatória.');
        process.exit(1);
      }
      collected.MASTODON_INSTANCE = instance;
      console.log(`\n  Crie um aplicativo em:`);
      console.log(`  → https://${instance}/settings/applications/new\n`);
      console.log(`  Configurações do formulário:`);
      console.log(`    Nome do aplicativo : dgk  (ou qualquer nome)`);
      console.log(`    Website            : (opcional)`);
      console.log(`    Redirect URI       : urn:ietf:wg:oauth:2.0:oob  ← manter o padrão`);
      console.log(`    Escopos            : read  write  push\n`);
      console.log(`  Após salvar, abra o aplicativo criado e copie o campo`);
      console.log(`  "Your access token" (não o client secret).\n`);
      const answer = await promptSecret(`${p.label}: `);
      collected[p.key] = answer.trim();
    } else if (p.secret) {
      const answer = await promptSecret(`${p.label}: `);
      collected[p.key] = answer.trim();
    } else {
      const label = p.default ? `${p.label} [${p.default}]` : p.label;
      const answer = await prompt(`${label}: `);
      collected[p.key] = answer.trim() || p.default || '';
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
  } else if (serviceId === 'buttondown') {
    identity = await verifyButtondown(collected.BUTTONDOWN_API_KEY);
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

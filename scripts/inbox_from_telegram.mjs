#!/usr/bin/env node
/**
 * Telegram inbox: polls for new messages and creates vault notes in 00 - Entrada/.
 *
 * Reads:  .lab/inbox-telegram-state.json (last processed update_id)
 * Writes: 00 - Entrada/YYYY-MM-DD HH-MM from telegram--<id>.md  (one per message)
 *         .lab/inbox-telegram-state.json              (updated state)
 *
 * Env vars (via dgk sow telegram):
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *
 * Options:
 *   --dry-run   Print notes without writing files
 *   --limit N   Max messages to process per run (default: 20)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STATE_JSON = join(ROOT, ".lab", "inbox-telegram-state.json");
const INBOX_DIR = join(ROOT, "00 - Entrada");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 20;
})();

function isoDate(unixTs) {
  return new Date(unixTs * 1000).toISOString().replace("T", " ").slice(0, 16);
}

function safeFilename(str) {
  return str.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
}

function mediaType(msg) {
  if (msg.photo)     return "photo";
  if (msg.video)     return "video";
  if (msg.audio)     return "audio";
  if (msg.voice)     return "voice";
  if (msg.document)  return "document";
  if (msg.sticker)   return "sticker";
  if (msg.animation) return "animation";
  if (msg.location)  return "location";
  if (msg.poll)      return "poll";
  return "text";
}

function messageLink(msg) {
  // Public channels expose a username; private groups/users do not.
  const username = msg.chat?.username;
  if (!username) return null;
  return `https://t.me/${username}/${msg.message_id}`;
}

function buildTitle(msg, from, text) {
  // Prefer first ~60 chars of message text; fall back to "Mídia de @sender".
  if (text) {
    const firstLine = text.split("\n")[0].trim();
    return firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
  }
  return `Mídia de ${from}`;
}

function buildNote(msg) {
  const ts = isoDate(msg.date);
  const from = msg.from?.username
    ? `@${msg.from.username}`
    : `${msg.from?.first_name || ""}${msg.from?.last_name ? " " + msg.from.last_name : ""}`.trim() || "desconhecido";
  const text = msg.text || msg.caption || "";
  const chatTitle = msg.chat?.title || msg.chat?.username || String(msg.chat?.id || "");
  const type = mediaType(msg);
  const link = messageLink(msg);
  const replyFrom = msg.reply_to_message?.from?.username
    ? `@${msg.reply_to_message.from.username}`
    : msg.reply_to_message ? "mensagem anterior" : null;

  const frontmatter = [
    "---",
    `title: "${buildTitle(msg, from, text).replace(/"/g, "'")}"`,
    `date: ${ts}`,
    `source: telegram`,
    `from: "${from}"`,
    `chat: "${chatTitle}"`,
    `mediaType: ${type}`,
    ...(link ? [`messageLink: "${link}"`] : []),
    ...(replyFrom ? [`replyTo: "${replyFrom}"`] : []),
    ...(msg.forward_from || msg.forward_from_chat ? [`forwarded: true`] : []),
    `status: inbox`,
    `tags: [entrada, telegram]`,
    "---",
    "",
  ].join("\n");

  // Body: text content + structured media info when applicable.
  const lines = [];
  if (text) lines.push(text, "");
  if (type !== "text") {
    const labels = {
      photo: "📷 Foto", video: "🎥 Vídeo", audio: "🎵 Áudio",
      voice: "🎤 Mensagem de voz", document: "📎 Documento",
      sticker: "🎭 Sticker", animation: "🎞️ GIF/Animação",
      location: "📍 Localização", poll: "📊 Enquete",
    };
    lines.push(`_${labels[type] ?? type} recebido._`, "");
  }
  if (replyFrom) lines.push(`> Em resposta a ${replyFrom}`, "");
  if (link) lines.push(`[Ver no Telegram](${link})`, "");

  return frontmatter + (lines.length ? lines.join("\n") : "_Mensagem sem conteúdo de texto._\n");
}

async function getUpdates(token, offset, limit, httpGet) {
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=${limit}&timeout=0`;
  return httpGet(url);
}

async function defaultGet(url) {
  const { request } = await import("node:https");
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(JSON.parse(data)));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export async function inboxFromTelegram({
  env = process.env,
  httpGet = defaultGet,
  statePath = STATE_JSON,
  inboxDir = INBOX_DIR,
  dryRun = DRY_RUN,
  limit = LIMIT,
} = {}) {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("inbox_from_telegram: TELEGRAM_BOT_TOKEN não configurado.");
    console.error("Configure com: dgk sow telegram");
    return { created: 0 };
  }

  const state = existsSync(statePath)
    ? (() => { try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return { lastUpdateId: 0 }; } })()
    : { lastUpdateId: 0 };

  const offset = state.lastUpdateId + 1;

  let updates;
  try {
    const resp = await getUpdates(token, offset, limit, httpGet);
    if (!resp.ok) {
      console.error(`inbox_from_telegram: erro da API Telegram: ${resp.description}`);
      return { created: 0 };
    }
    updates = resp.result || [];
  } catch (err) {
    console.error(`inbox_from_telegram: falha na requisição: ${err.message}`);
    return { created: 0 };
  }

  if (!updates.length) {
    console.log("inbox_from_telegram: nenhuma mensagem nova.");
    return { created: 0 };
  }

  console.log(`inbox_from_telegram: ${updates.length} update(s) recebidos.`);

  let created = 0;
  let maxId = state.lastUpdateId;

  for (const update of updates) {
    maxId = Math.max(maxId, update.update_id);
    const msg = update.message || update.channel_post;
    if (!msg) continue;

    const ts = isoDate(msg.date);
    const filename = safeFilename(`${ts} from telegram`) + `--${msg.message_id}.md`;
    const notePath = join(inboxDir, filename);
    const noteContent = buildNote(msg);

    if (dryRun) {
      console.log(`\n[dry-run] → ${notePath}\n${noteContent}`);
    } else {
      mkdirSync(inboxDir, { recursive: true });
      if (existsSync(notePath)) {
        console.log(`  já existe: ${filename}`);
      } else {
        writeFileSync(notePath, noteContent, "utf8");
        console.log(`  ✓ criado: ${filename}`);
        created++;
      }
    }
  }

  if (!dryRun) {
    mkdirSync(dirname(statePath), { recursive: true });
    state.lastUpdateId = maxId;
    writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  }

  return { created };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadSiloEnv } = await import("../packages/cli/src/silo.js");
  const siloEnv = loadSiloEnv();
  for (const [k, v] of Object.entries(siloEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  const result = await inboxFromTelegram();
  console.log(`\nNotas criadas: ${result.created}`);
}

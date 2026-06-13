#!/usr/bin/env node
/**
 * Telegram inbox: polls for new messages and creates vault notes in 00 - Entrada/.
 *
 * Reads:  dados/lab/inbox-telegram-state.json (last processed update_id)
 * Writes: 00 - Entrada/YYYY-MM-DD HH-MM from telegram.md  (one per message)
 *         dados/lab/inbox-telegram-state.json              (updated state)
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
const STATE_JSON = join(ROOT, "dados", "lab", "inbox-telegram-state.json");
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

function buildNote(msg) {
  const ts = isoDate(msg.date);
  const from = msg.from?.username
    ? `@${msg.from.username}`
    : `${msg.from?.first_name || ""}${msg.from?.last_name ? " " + msg.from.last_name : ""}`.trim() || "desconhecido";
  const text = msg.text || msg.caption || "";
  const chatTitle = msg.chat?.title || msg.chat?.username || String(msg.chat?.id || "");

  const frontmatter = [
    "---",
    `title: "Mensagem Telegram — ${ts}"`,
    `date: ${ts}`,
    `source: telegram`,
    `from: "${from}"`,
    `chat: "${chatTitle}"`,
    `status: inbox`,
    `tags: [entrada, telegram]`,
    "---",
    "",
  ].join("\n");

  const body = text
    ? `${text}\n`
    : "_Mensagem sem texto (pode conter mídia)._\n";

  return frontmatter + body;
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
    const filename = safeFilename(`${ts} from telegram`) + ".md";
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

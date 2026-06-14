#!/usr/bin/env node
/**
 * Telegram outbox: publishes notes flagged for Telegram to a bot/channel.
 *
 * Reads: dados/lab/outbox-publicacao.json
 * Writes: dados/lab/outbox-telegram.json (state — tracks what was sent)
 *
 * Env vars (via dgk sow telegram):
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — target channel/group/user
 *
 * Options:
 *   --dry-run   Print messages without posting
 *   --limit N   Max messages to send per run (default: 5)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { throttle, handleRateLimitResponse, DEFAULT_STATE_PATH as RATE_STATE_PATH } from "@aretw0/dgk-channels/rate-limiter";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTBOX_JSON = join(ROOT, "dados", "lab", "outbox-publicacao.json");
const STATE_JSON = join(ROOT, "dados", "lab", "outbox-telegram.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const LIMIT = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 5;
})();

function sha(str) {
  return createHash("sha256").update(str).digest("hex").slice(0, 12);
}

function formatMessage(note) {
  const title = note.title || note.path?.split("/").pop()?.replace(/\.md$/, "") || "Nota";
  // excerpt comes from outbox ETL; summary/description kept for backward compat.
  const body = note.excerpt || note.summary || note.description || "";
  const url = note.url || note.siteUrl || "";
  // Tags from frontmatter become hashtags; spaces → underscores per Telegram convention.
  const hashtags = (note.tags ?? [])
    .map((t) => `\#${String(t).replace(/\s+/g, "_")}`)
    .join(" ");

  let text = `*${escapeMarkdown(title)}*`;
  if (body) text += `\n\n${escapeMarkdown(body.length > 300 ? body.slice(0, 297) + "…" : body)}`;
  if (hashtags) text += `\n\n${hashtags}`;
  if (url) text += `\n\n[Leia mais ↗](${escapeMarkdown(url)})`;
  return text;
}

function escapeMarkdown(str) {
  // MarkdownV2 requires escaping these chars
  return String(str).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendMessage(token, chatId, text, httpPost) {
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" });
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  return httpPost(url, body);
}

async function defaultPost(url, body) {
  const { request } = await import("node:https");
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(JSON.parse(data)));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function publishToTelegram({
  env = process.env,
  httpPost = defaultPost,
  outboxPath = OUTBOX_JSON,
  statePath = STATE_JSON,
  rateLimiterStatePath = RATE_STATE_PATH,
  dryRun = DRY_RUN,
  force = FORCE,
  limit = LIMIT,
} = {}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("publish_to_telegram: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.");
    console.error("Configure com: dgk sow telegram");
    return { sent: 0, skipped: 0 };
  }

  if (!existsSync(outboxPath)) {
    console.log(`publish_to_telegram: ${outboxPath} não encontrado. Execute dgk lab etl primeiro.`);
    return { sent: 0, skipped: 0 };
  }

  const outbox = JSON.parse(readFileSync(outboxPath, "utf8"));
  const notes = (outbox.notes || outbox.items || []).filter((n) => {
    const channels = n.channels || n.outboxChannels || [];
    return channels.includes("telegram");
  });

  if (!notes.length) {
    console.log("publish_to_telegram: nenhuma nota com channel=telegram no outbox.");
    return { sent: 0, skipped: 0 };
  }

  const state = existsSync(statePath)
    ? (() => { try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return { sent: {} }; } })()
    : { sent: {} };

  const pending = force
    ? notes
    : notes.filter((n) => !state.sent[sha(n.path || n.title || "")]);
  const batch = pending.slice(0, limit);

  if (force && notes.length) console.log("publish_to_telegram: modo --force, ignorando estado de envio anterior.");
  console.log(`publish_to_telegram: ${batch.length} nota(s) para enviar (${pending.length - batch.length} restantes).`);

  let sentCount = 0;
  for (const note of batch) {
    const key = sha(note.path || note.title || "");
    const text = formatMessage(note);

    if (dryRun) {
      console.log(`\n[dry-run] → chat ${chatId}\n${text}\n`);
    } else {
      await throttle("telegram", { statePath: rateLimiterStatePath });
      try {
        const result = await sendMessage(token, chatId, text, httpPost);
        const retryAfter = handleRateLimitResponse(result, "telegram");
        if (retryAfter) {
          console.warn(`  [429] aguardando ${retryAfter / 1000}s antes de retentar...`);
          await new Promise((r) => setTimeout(r, retryAfter));
          const retry = await sendMessage(token, chatId, text, httpPost);
          if (!retry.ok) { console.error(`  erro após retry: ${retry.description}`); continue; }
        } else if (!result.ok) {
          console.error(`  erro: ${result.description}`);
          continue;
        }
        console.log(`  ✓ enviado: ${note.title || note.path}`);
      } catch (err) {
        console.error(`  erro ao enviar ${note.path}: ${err.message}`);
        continue;
      }
    }

    state.sent[key] = { path: note.path, sentAt: new Date().toISOString() };
    sentCount++;
  }

  if (!dryRun) {
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  }
  return { sent: sentCount, skipped: pending.length - batch.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadSiloEnv } = await import("../packages/cli/src/silo.js");
  const siloEnv = loadSiloEnv();
  for (const [k, v] of Object.entries(siloEnv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  const result = await publishToTelegram();
  if (!DRY_RUN) {
    console.log(`\nPublicados: ${result.sent} | Pendentes: ${result.skipped}`);
  }
}

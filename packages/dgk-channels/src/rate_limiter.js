/**
 * Platform-agnostic rate limiter for publish pipelines.
 * Usable by vault-seed, refarm, agents-lab, or any publishing pipeline.
 * No project-specific dependencies.
 *
 * State: ~/.dgk/rate-limits.json — machine-local, never git-tracked.
 * Rate limits are per-device and per-bot-token, so they must stay local.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_STATE_PATH = join(homedir(), ".dgk", "rate-limits.json");

// Conservative defaults — below each platform's published hard limits.
// Telegram:  30 msg/s globally, 1 msg/s per chat.
// Mastodon:  varies by instance (typically 300 req/5min).
// Bluesky:   ~5000 req/day authenticated.
// WhatsApp:  80 msg/s tier-1, varies by WABA tier.
// Buttondown: generous but undocumented; keep conservative.
export const PLATFORM_LIMITS = {
  telegram:   { minDelayMs: 1100, burstLimit: 20, burstWindowMs: 60_000 },
  mastodon:   { minDelayMs: 1000, burstLimit: 50, burstWindowMs: 60_000 },
  bluesky:    { minDelayMs: 1200, burstLimit: 80, burstWindowMs: 300_000 },
  whatsapp:   { minDelayMs: 1100, burstLimit: 60, burstWindowMs: 60_000 },
  buttondown: { minDelayMs: 500,  burstLimit: 10, burstWindowMs: 60_000 },
};

function loadState(statePath) {
  if (!existsSync(statePath)) return {};
  try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return {}; }
}

function saveState(state, statePath) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function defaultSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Waits if needed to stay within rate limits for the given platform.
 * Updates persisted state so subsequent calls in the same run respect spacing.
 *
 * @param {string} platform
 * @param {object} [opts]
 * @param {string}   [opts.statePath]  — path to rate-limits state file
 * @param {object}   [opts.limits]     — override limits for this platform
 * @param {function} [opts.sleep]      — injectable sleep (ms) for testing
 */
export async function throttle(platform, {
  statePath = DEFAULT_STATE_PATH,
  limits = PLATFORM_LIMITS[platform],
  sleep = defaultSleep,
} = {}) {
  if (!limits) return;

  const state = loadState(statePath);
  const now = Date.now();
  const ps = state[platform] ?? { lastSentAt: 0, windowStart: now, sentInWindow: 0 };

  if (now - ps.windowStart > limits.burstWindowMs) {
    ps.windowStart = now;
    ps.sentInWindow = 0;
  }

  const sinceLastSend = now - ps.lastSentAt;
  if (sinceLastSend < limits.minDelayMs) {
    await sleep(limits.minDelayMs - sinceLastSend);
  }

  if (ps.sentInWindow >= limits.burstLimit) {
    const windowRemaining = limits.burstWindowMs - (Date.now() - ps.windowStart);
    if (windowRemaining > 0) {
      console.warn(`  [rate-limiter] ${platform}: burst limit. Aguardando ${Math.ceil(windowRemaining / 1000)}s...`);
      await sleep(windowRemaining);
      ps.windowStart = Date.now();
      ps.sentInWindow = 0;
      const sinceLastSendAfterBurst = Date.now() - ps.lastSentAt;
      if (sinceLastSendAfterBurst < limits.minDelayMs) {
        await sleep(limits.minDelayMs - sinceLastSendAfterBurst);
      }
    }
  }

  ps.lastSentAt = Date.now();
  ps.sentInWindow += 1;
  state[platform] = ps;
  saveState(state, statePath);
}

/**
 * Extracts retry-after delay (ms) from a rate-limit API response.
 * Returns 0 if the response is not a rate-limit error.
 *
 * @param {object} response — parsed JSON response
 * @param {string} platform
 * @returns {number}
 */
export function handleRateLimitResponse(response, platform) {
  if (!response) return 0;

  // Telegram: { ok: false, error_code: 429, parameters: { retry_after: N } }
  if (platform === "telegram" && response.error_code === 429) {
    return (response.parameters?.retry_after ?? 30) * 1000;
  }

  if (response.status === 429 || response.error_code === 429) {
    return (response.retryAfter ?? 30) * 1000;
  }

  return 0;
}

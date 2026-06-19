import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { throttle, handleRateLimitResponse, PLATFORM_LIMITS } from "../src/rate_limiter.js";

function tempDir() {
  const dir = join(tmpdir(), `rl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const noSleep = async () => {};

describe("PLATFORM_LIMITS", () => {
  test("cobre todas as plataformas esperadas", () => {
    for (const p of ["telegram", "mastodon", "bluesky", "whatsapp", "buttondown"]) {
      assert.ok(p in PLATFORM_LIMITS, `${p} deve ter limites definidos`);
      const l = PLATFORM_LIMITS[p];
      assert.ok(typeof l.minDelayMs === "number" && l.minDelayMs > 0);
      assert.ok(typeof l.burstLimit === "number" && l.burstLimit > 0);
      assert.ok(typeof l.burstWindowMs === "number" && l.burstWindowMs > 0);
    }
  });

  test("limites do telegram são conservadores (minDelay >= 1000ms)", () => {
    assert.ok(PLATFORM_LIMITS.telegram.minDelayMs >= 1000);
  });
});

describe("throttle", () => {
  let dir;
  beforeEach(() => { dir = tempDir(); });
  afterEach(() => rmSync(dir, { recursive: true }));

  test("plataforma desconhecida retorna sem sleep", async () => {
    const slept = [];
    await throttle("plataforma-inexistente", {
      statePath: join(dir, "state.json"),
      sleep: async (ms) => slept.push(ms),
    });
    assert.equal(slept.length, 0);
  });

  test("primeira chamada não precisa esperar (sem estado anterior)", async () => {
    const slept = [];
    await throttle("telegram", {
      statePath: join(dir, "state.json"),
      limits: { minDelayMs: 500, burstLimit: 10, burstWindowMs: 60_000 },
      sleep: async (ms) => slept.push(ms),
    });
    assert.equal(slept.length, 0, "primeira chamada não deve dormir");
  });

  test("persiste estado após chamada", async () => {
    const statePath = join(dir, "state.json");
    await throttle("telegram", { statePath, sleep: noSleep });
    assert.ok(existsSync(statePath), "estado deve ser salvo");
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    assert.ok(state.telegram?.lastSentAt > 0);
    assert.equal(state.telegram.sentInWindow, 1);
  });

  test("segunda chamada imediata dorme o minDelay", async () => {
    const statePath = join(dir, "state.json");
    const slept = [];
    const limits = { minDelayMs: 200, burstLimit: 10, burstWindowMs: 60_000 };

    await throttle("telegram", { statePath, limits, sleep: noSleep });
    await throttle("telegram", {
      statePath,
      limits,
      sleep: async (ms) => slept.push(ms),
    });

    assert.ok(slept.length > 0, "deve dormir na segunda chamada imediata");
    assert.ok(slept[0] <= 200, `sleep deve ser <= minDelayMs (foi ${slept[0]}ms)`);
  });

  test("burst limit força espera ao atingir o limite", async () => {
    const statePath = join(dir, "state.json");
    const slept = [];
    const limits = { minDelayMs: 0, burstLimit: 3, burstWindowMs: 5_000 };

    for (let i = 0; i < 3; i++) {
      await throttle("telegram", { statePath, limits, sleep: noSleep });
    }
    // 4ª chamada — deve atingir burst limit
    await throttle("telegram", { statePath, limits, sleep: async (ms) => slept.push(ms) });
    assert.ok(slept.length > 0, "deve dormir ao atingir burst limit");
  });
});

describe("handleRateLimitResponse", () => {
  test("retorna 0 para resposta bem-sucedida", () => {
    assert.equal(handleRateLimitResponse({ ok: true }, "telegram"), 0);
  });

  test("retorna 0 para null", () => {
    assert.equal(handleRateLimitResponse(null, "telegram"), 0);
  });

  test("telegram 429 retorna retry_after em ms", () => {
    const ms = handleRateLimitResponse(
      { ok: false, error_code: 429, parameters: { retry_after: 10 } },
      "telegram",
    );
    assert.equal(ms, 10_000);
  });

  test("telegram 429 sem retry_after usa default 30s", () => {
    const ms = handleRateLimitResponse({ ok: false, error_code: 429 }, "telegram");
    assert.equal(ms, 30_000);
  });

  test("status 429 genérico retorna 30s por padrão", () => {
    const ms = handleRateLimitResponse({ status: 429 }, "mastodon");
    assert.equal(ms, 30_000);
  });

  test("retryAfter customizado é respeitado", () => {
    const ms = handleRateLimitResponse({ status: 429, retryAfter: 60 }, "mastodon");
    assert.equal(ms, 60_000);
  });
});

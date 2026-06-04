import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root = process.cwd();
const distDir = join(root, "dist");

function resolveDistPath(urlPath) {
  const pathName = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const normalized = pathName.replace(/^\/+/, "");

  const candidates = [];
  if (!normalized) {
    candidates.push(join(distDir, "index.html"));
  } else {
    candidates.push(join(distDir, normalized));
    if (pathName.endsWith("/")) {
      candidates.push(join(distDir, normalized, "index.html"));
    } else {
      candidates.push(join(distDir, `${normalized}.html`));
    }
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (!statSync(candidate).isFile()) continue;
    const resolved = resolve(candidate);
    const rel = relative(distDir, resolved);
    if (!rel.startsWith("..") && rel !== "") {
      return resolved;
    }
    if (rel === "") {
      return resolved;
    }
  }

  return null;
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
]);

function fail(message, failures) {
  failures.push(message);
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    const urlPath = request.url || "/";
    const filePath = resolveDistPath(urlPath);

    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const body = await readFile(filePath);
    const type = contentTypes.get(extname(filePath)) || "application/octet-stream";
    response.writeHead(200, { "content-type": type });
    response.end(body);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Graph smoke server did not expose a TCP port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function beginFrameSamples(page) {
  await page.evaluate(() => {
    const samples = [];
    let last = performance.now();
    const state = {
      samples,
      running: true,
      id: 0,
    };

    const tick = (time) => {
      if (!state.running) return;
      const delta = time - last;
      if (Number.isFinite(delta) && delta > 0) {
        samples.push(delta);
      }
      last = time;
      state.id = requestAnimationFrame(tick);
    };

    const rafId = requestAnimationFrame((time) => {
      last = time;
      state.id = requestAnimationFrame(tick);
    });
    state.id = rafId;

    window.__vaultGraphFrameSamples = state;
  });
}

async function endFrameSamples(page) {
  return page.evaluate(() => {
    const state = window.__vaultGraphFrameSamples;
    if (!state || !Array.isArray(state.samples)) return null;

    state.running = false;
    if (state.id) {
      cancelAnimationFrame(state.id);
    }

    const samples = state.samples.filter((value) => Number.isFinite(value) && value >= 0);
    if (!samples.length) return { count: 0 };

    const sorted = [...samples].sort((a, b) => a - b);
    const total = sorted.reduce((acc, value) => acc + value, 0);

    return {
      count: sorted.length,
      avg: total / sorted.length,
      max: sorted[sorted.length - 1],
      p90: sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    };
  });
}

function assertNoErrorNoise(messages, failures) {
  const filtered = messages.filter((message) => /Unsupported color format:\s*""|ReferenceError|TypeError/i.test(message));
  if (filtered.length) {
    fail(`console error noise detected: ${filtered.join(' | ')}`, failures);
  }
}

async function runExploreGraphPerformanceSmoke() {
  const failures = [];

  if (!existsSync(distDir)) {
    fail("dist/ não existe. Rode pnpm run site:build antes desse smoke.", failures);
  }

  if (!existsSync(join(distDir, "explorar", "index.html"))) {
    fail("dist/explorar/index.html não encontrado.", failures);
  }

  const { baseUrl, close } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1536, height: 920 },
      deviceScaleFactor: 1,
    });

    const consoleMessages = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleMessages.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(String(error?.message || error));
    });

    await page.goto(`${baseUrl}/explorar/`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const graph = page.locator('.vault-graph-preview .vault-graph-view');
    await graph.first().waitFor({ state: "visible", timeout: 20000 });

    const firstNode = graph.locator("[data-vault-graph-node-id]").first();
    await firstNode.waitFor({ state: "visible", timeout: 12000 });

    const nodeCount = await graph.locator("[data-vault-graph-node-id]").count();
    assert.ok(nodeCount > 0, "Graph must render at least one node element.");

    const stressTarget = await firstNode.boundingBox();
    if (!stressTarget) {
      fail('Unable to locate drag target for graph stress sample.', failures);
    } else {
      const stressStartX = stressTarget.x + stressTarget.width * 0.25;
      const stressStartY = stressTarget.y + stressTarget.height * 0.25;
      const stressMoves = Number.parseInt(process.env.GRAPH_SMOKE_STRESS_MOVES ?? "45", 10);
      const minSamples = Number.parseInt(process.env.GRAPH_SMOKE_STRESS_MIN_SAMPLES ?? "20", 10);
      const maxAvg = Number.parseFloat(process.env.GRAPH_SMOKE_STRESS_MAX_AVG ?? "120");
      const maxP95 = Number.parseFloat(process.env.GRAPH_SMOKE_STRESS_MAX_P95 ?? "220");
      const stepWaitMs = Number.parseInt(process.env.GRAPH_SMOKE_STRESS_STEP_WAIT_MS ?? "6", 10);

      await beginFrameSamples(page);
      await page.mouse.move(stressStartX, stressStartY);
      await page.mouse.down();

      for (let index = 1; index <= stressMoves; index += 1) {
        const ratio = index / stressMoves;
        const waveX = Math.sin(ratio * Math.PI * 1.2) * 2;
        const waveY = Math.cos(ratio * Math.PI * 0.8) * 2;
        const x = stressStartX + ratio * 48 + waveX;
        const y = stressStartY + ratio * 24 + waveY;

        await page.mouse.move(x, y, { steps: 1 });
        if (stepWaitMs > 0) {
          await page.waitForTimeout(stepWaitMs);
        }
      }

      await page.mouse.up();
      await page.waitForTimeout(120);

      const stressFrameStats = await endFrameSamples(page);
      assert.ok(stressFrameStats && stressFrameStats.count >= minSamples, `Drag stress test should capture at least ${minSamples} frame samples.`);
      assert.ok(stressFrameStats.avg <= maxAvg, `Average frame interval under sustained drag is too high (${stressFrameStats.avg.toFixed(1)}ms).`);
      assert.ok(stressFrameStats.p95 <= maxP95, `95th-percentile frame interval under sustained drag is too high (${stressFrameStats.p95.toFixed(1)}ms).`);
    }

    assertNoErrorNoise([...consoleMessages, ...pageErrors], failures);

    if (failures.length) {
      assert.fail(failures.join("\n"));
    }
  } finally {
    await browser.close();
    await close();
  }

  assert.equal(failures.length, 0, failures.join("\n"));
}

runExploreGraphPerformanceSmoke()
  .then(() => {
    console.log("Explore graph performance smoke: pass");
  })
  .catch((error) => {
    console.error("Explore graph performance smoke failed:");
    console.error(String(error?.message || error));
    process.exit(1);
  });

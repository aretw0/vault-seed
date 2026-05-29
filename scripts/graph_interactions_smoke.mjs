import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

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
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
]);

function fail(message, failures) {
  failures.push(message);
}

function parseVisibleCount(caption) {
  const match = String(caption || "").match(/(\d+)\s+n[oó]s em destaque/i);
  return match ? Number(match[1]) : 0;
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
    if (!state || !Array.isArray(state.samples)) {
      return null;
    }

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

async function parseViewportTransform(graph) {
  return graph.locator('[data-vault-graph-viewport]').first().getAttribute('transform');
}

async function readVisibleNodesState(graph) {
  return graph.evaluate((graphRoot) => {
    const canvas = graphRoot.querySelector('.vault-graph-view__canvas');
    if (!canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const nodes = Array.from(graphRoot.querySelectorAll('[data-vault-graph-node-id]'));
    const visibleNodes = nodes.filter((node) => {
      if (node.hasAttribute('hidden')) return false;
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    return {
      canvas: {
        left: canvasRect.left,
        right: canvasRect.right,
        top: canvasRect.top,
        bottom: canvasRect.bottom,
      },
      nodes: visibleNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const id = node.getAttribute('data-vault-graph-node-id') || '';
        return {
          id,
          x: Number.parseFloat(node.getAttribute('data-vault-graph-node-x') || '0'),
          y: Number.parseFloat(node.getAttribute('data-vault-graph-node-y') || '0'),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      }),
    };
  });
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

function assertNoErrorNoise(messages, failures) {
  const filtered = messages.filter((message) =>
    /Unsupported color format:\s*""|ReferenceError|TypeError/i.test(message),
  );
  if (filtered.length) {
    fail(`console error noise detected: ${filtered.join(' | ')}`, failures);
  }
}

async function runExploreGraphSmoke() {
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

    const nodeCount = await graph.locator("[data-vault-graph-node-id]").count();
    assert.ok(nodeCount > 0, "Graph must render at least one node element.");

    const captionNode = graph.locator("[data-vault-graph-caption]");
    const captionText = await captionNode.textContent();
    const beforeVisible = parseVisibleCount(captionText);
    assert.ok(beforeVisible > 0, "Graph caption must report at least one visible node.");

    const expectedMax = await graph.locator("[data-vault-graph-node-id]").count();

    const viewportLocator = graph.locator("[data-vault-graph-viewport]");
    const initialTransform = await parseViewportTransform(graph);

    await graph.locator('[data-vault-graph-action="expand"]').click();
    await page.waitForTimeout(220);

    const expandedCaption = await captionNode.textContent();
    const expandedVisible = parseVisibleCount(expandedCaption);
    if (expectedMax > beforeVisible) {
      assert.ok(
        expandedVisible >= beforeVisible,
        "Expand action should keep or increase visible count.",
      );
    }

    if (expandedVisible > beforeVisible) {
      await graph.locator('[data-vault-graph-action="collapse"]').click();
      await page.waitForTimeout(220);
      const collapsedCaption = await captionNode.textContent();
      const collapsedVisible = parseVisibleCount(collapsedCaption);
      assert.ok(
        collapsedVisible <= expandedVisible,
        "Collapse action should keep or decrease visible count.",
      );
    }

    const firstNode = graph.locator("[data-vault-graph-node-id]").first();
    const fullLabel = await firstNode.getAttribute("data-vault-graph-node-label");
    await firstNode.dispatchEvent('pointerenter');
    await page.waitForTimeout(120);

    const hoverLabel = await graph.locator('.vault-graph-view__hover-label').textContent();
    assert.ok(
      hoverLabel && fullLabel && hoverLabel === String(fullLabel),
      "Hover label must expose the full node label.",
    );

    const hoverBounds = await graph
      .locator('.vault-graph-view__hover-label')
      .evaluate((element) => {
        const box = element.getBBox();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          visible: element.getAttribute('visibility') || 'visible',
          opacity: Number(element.style.opacity || '1'),
        };
      });

    if (hoverBounds.width === 0 || hoverBounds.height === 0) {
      fail("Hover label has zero size.", failures);
    }

    if (hoverBounds.x < -1 || hoverBounds.y < -1 || hoverBounds.x + hoverBounds.width > 206 || hoverBounds.y + hoverBounds.height > 206) {
      fail(`Hover label escapes graph viewport: ${JSON.stringify(hoverBounds)}`, failures);
    }

    const rect = await graph.locator('.vault-graph-view__canvas').boundingBox();
    assert.ok(rect, "Graph canvas should have a bounding box.");

    const start = {
      x: rect.x + rect.width - 25,
      y: rect.y + rect.height - 25,
    };
    const end = {
      x: start.x - 40,
      y: start.y - 30,
    };

    await page.evaluate(
      ({ selector, startX, startY, endX, endY }) => {
        const svg = document.querySelector(selector);
        if (!svg) return;

        const pointerDown = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 111,
          pointerType: 'mouse',
          clientX: startX,
          clientY: startY,
          button: 0,
        });
        svg.dispatchEvent(pointerDown);

        const pointerMove = new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          pointerId: 111,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 0,
        });
        window.dispatchEvent(pointerMove);

        const pointerUp = new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 111,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 0,
        });
        window.dispatchEvent(pointerUp);
      },
      {
        selector: '.vault-graph-preview .vault-graph-view__canvas',
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
      },
    );

    const afterPanTransform = await parseViewportTransform(graph);
    assert.ok(
      afterPanTransform && afterPanTransform !== initialTransform,
      "Pan interaction should update viewport transform.",
    );

    const firstNodeRect = await firstNode.boundingBox();
    assert.ok(firstNodeRect, "First graph node should expose a bounding box.");

    const rightPanStart = {
      x: firstNodeRect.x + firstNodeRect.width / 2,
      y: firstNodeRect.y + firstNodeRect.height / 2,
    };
    const rightPanEnd = {
      x: rightPanStart.x + 45,
      y: rightPanStart.y + 28,
    };

    await page.evaluate(
      ({ selector, startX, startY, endX, endY }) => {
        const node = document.querySelector(selector);
        if (!node) return;

        const pointerDown = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 222,
          pointerType: 'mouse',
          clientX: startX,
          clientY: startY,
          button: 2,
        });
        node.dispatchEvent(pointerDown);

        const pointerMove = new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          pointerId: 222,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 2,
        });
        window.dispatchEvent(pointerMove);

        const pointerUp = new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 222,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 2,
        });
        window.dispatchEvent(pointerUp);
      },
      {
        selector: '.vault-graph-preview .vault-graph-view [data-vault-graph-node-id]',
        startX: rightPanStart.x,
        startY: rightPanStart.y,
        endX: rightPanEnd.x,
        endY: rightPanEnd.y,
      },
    );
    await page.waitForTimeout(120);

    const afterRightPanTransform = await parseViewportTransform(graph);
    assert.ok(
      afterRightPanTransform && afterRightPanTransform !== afterPanTransform,
      "Right-click pan on node should update viewport transform.",
    );
    const rightPanNodeState = await readVisibleNodesState(graph);
    assert.ok(Array.isArray(rightPanNodeState?.nodes) && rightPanNodeState.nodes.length > 0, 'Graph should expose visible nodes after right-click pan.');

    if (rightPanNodeState && rightPanNodeState.nodes.length) {
      const { canvas, nodes: visibleNodes } = rightPanNodeState;
      for (const node of visibleNodes) {
        const overlaps =
          node.right > canvas.left + 0.2 &&
          node.left < canvas.right - 0.2 &&
          node.bottom > canvas.top + 0.2 &&
          node.top < canvas.bottom - 0.2;
        assert.ok(overlaps, `Visible node ${node.id} should remain inside the graph canvas.`);
      }
    }

    const beforeNodeX = Number.parseFloat((await firstNode.getAttribute('data-vault-graph-node-x')) || '0');
    const beforeNodeY = Number.parseFloat((await firstNode.getAttribute('data-vault-graph-node-y')) || '0');
    const beforeNodesState = await readVisibleNodesState(graph);
    const beforeDragNodeById = new Map();
    for (const node of beforeNodesState?.nodes || []) {
      beforeDragNodeById.set(node.id, node);
    }
    const dragDeltaX = Number.isFinite(beforeNodeX) && beforeNodeX > 110 ? -40 : 40;
    const dragDeltaY = Number.isFinite(beforeNodeY) && beforeNodeY > 110 ? -30 : 30;
    const dragStart = {
      x: rightPanEnd.x + 5,
      y: rightPanEnd.y + 5,
    };
    const dragEnd = {
      x: dragStart.x + dragDeltaX,
      y: dragStart.y + dragDeltaY,
    };

    await page.evaluate(
      ({ selector, startX, startY, endX, endY }) => {
        const node = document.querySelector(selector);
        if (!node) return;

        const down = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 333,
          pointerType: 'mouse',
          clientX: startX,
          clientY: startY,
          button: 0,
        });
        node.dispatchEvent(down);

        const move = new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          pointerId: 333,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 0,
        });
        window.dispatchEvent(move);

        const up = new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 333,
          pointerType: 'mouse',
          clientX: endX,
          clientY: endY,
          button: 0,
        });
        window.dispatchEvent(up);
      },
      {
        selector: '.vault-graph-preview .vault-graph-view [data-vault-graph-node-id]',
        startX: dragStart.x,
        startY: dragStart.y,
        endX: dragEnd.x,
        endY: dragEnd.y,
      },
    );
    await page.waitForTimeout(120);

    const afterNodesState = await readVisibleNodesState(graph);
    const afterDragNodeById = new Map();
    for (const node of afterNodesState?.nodes || []) {
      afterDragNodeById.set(node.id, node);
    }

    let anyNodeMoved = false;
    for (const [id, beforeNode] of beforeDragNodeById.entries()) {
      const afterNode = afterDragNodeById.get(id);
      if (!afterNode) continue;

      if (
        Number.isFinite(beforeNode.x) && Number.isFinite(afterNode.x) && Math.abs(afterNode.x - beforeNode.x) > 0.12
      ) {
        anyNodeMoved = true;
        break;
      }

      if (
        Number.isFinite(beforeNode.y) && Number.isFinite(afterNode.y) && Math.abs(afterNode.y - beforeNode.y) > 0.12
      ) {
        anyNodeMoved = true;
        break;
      }
    }

    assert.ok(anyNodeMoved, "Drag interaction should move at least one visible node.");

    const stressTarget = await firstNode.boundingBox();
    if (stressTarget) {
      const stressStartX = stressTarget.x + stressTarget.width * 0.25;
      const stressStartY = stressTarget.y + stressTarget.height * 0.25;
      const stressMoves = 45;

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
        await page.waitForTimeout(6);
      }
      await page.mouse.up();
      await page.waitForTimeout(120);
      const stressFrameStats = await endFrameSamples(page);

      assert.ok(stressFrameStats && stressFrameStats.count >= 20, 'Drag stress test should capture frame samples.');
      assert.ok(
        stressFrameStats.avg <= 120,
        `Average frame interval under sustained drag is too high (${stressFrameStats.avg.toFixed(1)}ms).`
      );
      assert.ok(
        stressFrameStats.p95 <= 220,
        `95th-percentile frame interval under sustained drag is too high (${stressFrameStats.p95.toFixed(1)}ms).`
      );
    } else {
      fail('Unable to locate drag target for graph stress sample.', failures);
    }

    // Ensure drag interaction causes a measurable movement in the graph state.

    await page.evaluate(
      ({ selector, x, y }) => {
        const svg = document.querySelector(selector);
        if (!svg) return;

        const wheel = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          deltaY: -120,
          deltaMode: 0,
        });

        svg.dispatchEvent(wheel);
      },
      {
        selector: '.vault-graph-preview .vault-graph-view__canvas',
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      },
    );
    await page.waitForTimeout(120);

    const afterZoomTransform = await parseViewportTransform(graph);
    assert.ok(
      afterZoomTransform && afterZoomTransform !== afterPanTransform,
      "Zoom interaction should update viewport transform.",
    );
    const afterZoomNodesState = await readVisibleNodesState(graph);
    if (afterZoomNodesState && afterZoomNodesState.nodes.length) {
      const { canvas, nodes: visibleNodes } = afterZoomNodesState;
      for (const node of visibleNodes) {
        const overlaps =
          node.right > canvas.left + 0.2 &&
          node.left < canvas.right - 0.2 &&
          node.bottom > canvas.top + 0.2 &&
          node.top < canvas.bottom - 0.2;
        assert.ok(overlaps, `Visible node ${node.id} should remain inside the graph canvas after zoom.`);
      }
    }

    await page.waitForTimeout(100);
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

runExploreGraphSmoke()
  .then(() => {
    console.log("Explore graph interaction smoke: pass");
  })
  .catch((error) => {
    console.error("Explore graph interaction smoke failed:");
    console.error(String(error?.message || error));
    process.exit(1);
  });

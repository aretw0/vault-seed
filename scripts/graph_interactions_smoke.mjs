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

async function parseViewportTransform(graph) {
  return graph.locator('[data-vault-graph-viewport]').first().getAttribute('transform');
}

async function pointerDrag(page, {
  selector,
  startX,
  startY,
  endX,
  endY,
  pointerId = 700,
  button = 0,
}) {
  await page.evaluate(
    ({ selector, startX, startY, endX, endY, pointerId, button }) => {
      const target = document.querySelector(selector);
      if (!target) return;

      const down = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'mouse',
        clientX: startX,
        clientY: startY,
        button,
      });
      target.dispatchEvent(down);

      const move = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'mouse',
        clientX: endX,
        clientY: endY,
        button,
      });
      window.dispatchEvent(move);

      const up = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'mouse',
        clientX: endX,
        clientY: endY,
        button,
      });
      window.dispatchEvent(up);
    },
    {
      selector,
      startX,
      startY,
      endX,
      endY,
      pointerId,
      button,
    },
  );
}

async function wheelZoomAt(page, { selector, x, y, deltaY }) {
  await page.evaluate(
    ({ selector, x, y, deltaY }) => {
      const target = document.querySelector(selector);
      if (!target) return;

      target.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          deltaY,
          deltaMode: 0,
        }),
      );
    },
    { selector, x, y, deltaY },
  );
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

function ensureNodesWithinCanvas(state, label, failures) {
  if (!state || !Array.isArray(state.nodes) || state.nodes.length === 0) return;

  const { canvas, nodes } = state;
  for (const node of nodes) {
    const overlaps =
      node.right > canvas.left + 0.2 &&
      node.left < canvas.right - 0.2 &&
      node.bottom > canvas.top + 0.2 &&
      node.top < canvas.bottom - 0.2;
    if (!overlaps) {
      fail(`Node ${node.id} must stay inside the graph canvas (${label}).`, failures || []);
    }
  }
}

function nodeSpread(nodes) {
  if (!nodes || !nodes.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const x = Number(node.x);
    const y = Number(node.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
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

async function readHoverLabelBounds(graph) {
  return graph.locator('.vault-graph-view__hover-label').evaluate((element) => {
    const box = element.getBBox();
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      text: element.textContent || '',
      textAnchor: element.getAttribute('text-anchor') || 'middle',
      hasChildren: element.childElementCount,
      visibility: element.getAttribute('visibility') || 'visible',
      opacity: Number(element.style.opacity || '1'),
    };
  });
}

function assertHoverLabelInsideViewport(hoverBounds, failures, label) {
  if (!hoverBounds) {
    fail(`Unable to inspect hover label bounds (${label}).`, failures);
    return;
  }
  if (hoverBounds.width === 0 || hoverBounds.height === 0) {
    fail(`Hover label has zero size (${label}).`, failures);
  }
  if (
    hoverBounds.x < -1.5 ||
    hoverBounds.y < -1.5 ||
    hoverBounds.x + hoverBounds.width > 206 ||
    hoverBounds.y + hoverBounds.height > 206
  ) {
    fail(`Hover label escapes graph viewport (${label}): ${JSON.stringify(hoverBounds)}`, failures);
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

    const toolbarLayout = await graph
      .locator('.vault-graph-view__toolbar .vault-graph-view__button')
      .evaluateAll((buttons) => {
        const bounds = buttons.map((button) => button.getBoundingClientRect());
        const distinctRows = new Set(
          bounds
            .map((box) => Math.round(box.y / 2))
            .filter((value) => Number.isFinite(value)),
        );
        const sizes = bounds.map((box) => ({ width: box.width, height: box.height }));
        return {
          buttonCount: bounds.length,
          rowCount: distinctRows.size,
          sizes,
        };
      });

    assert.ok(toolbarLayout.buttonCount >= 3, "Graph toolbar should expose expand/collapse/recenter controls.");
    assert.ok(toolbarLayout.rowCount === 1, "Graph toolbar controls must stay on a single row.");
    for (const size of toolbarLayout.sizes) {
      assert.ok(size.width > 1 && size.height > 1, "Graph toolbar buttons should keep measurable size.");
    }

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

    const rect = await graph.locator('.vault-graph-view__canvas').boundingBox();
    assert.ok(rect, "Graph canvas should have a bounding box.");

    const hoverBounds = await readHoverLabelBounds(graph);
    assertHoverLabelInsideViewport(hoverBounds, failures, 'initial hover');

    const dragNodeTo = async (targetX, targetY) => {
      const nodeRect = await firstNode.boundingBox();
      if (!nodeRect) return;

      const startX = nodeRect.x + nodeRect.width / 2;
      const startY = nodeRect.y + nodeRect.height / 2;
      await pointerDrag(page, {
        selector: '.vault-graph-preview .vault-graph-view [data-vault-graph-node-id]',
        startX,
        startY,
        endX: targetX,
        endY: targetY,
        pointerId: 500,
      });
      await page.waitForTimeout(120);
    };

    const canvasRect = rect;
    const canvasLeft = canvasRect.x + 14;
    const canvasRight = canvasRect.x + canvasRect.width - 14;
    const canvasMidY = canvasRect.y + canvasRect.height / 2;

    await dragNodeTo(canvasLeft, canvasMidY);
    await firstNode.dispatchEvent('pointerenter');
    await page.waitForTimeout(90);
    assertHoverLabelInsideViewport(await readHoverLabelBounds(graph), failures, 'hover at left side');

    await dragNodeTo(canvasRight, canvasMidY);
    await firstNode.dispatchEvent('pointerenter');
    await page.waitForTimeout(90);
    assertHoverLabelInsideViewport(await readHoverLabelBounds(graph), failures, 'hover at right side');

    const start = {
      x: rect.x + rect.width - 25,
      y: rect.y + rect.height - 25,
    };
    const end = {
      x: start.x - 40,
      y: start.y - 30,
    };

    await pointerDrag(page, {
      selector: '.vault-graph-preview .vault-graph-view__canvas',
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      pointerId: 111,
    });

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

    await pointerDrag(page, {
      selector: '.vault-graph-preview .vault-graph-view [data-vault-graph-node-id]',
      startX: rightPanStart.x,
      startY: rightPanStart.y,
      endX: rightPanEnd.x,
      endY: rightPanEnd.y,
      pointerId: 222,
      button: 2,
    });
    await page.waitForTimeout(120);

    const afterRightPanTransform = await parseViewportTransform(graph);
    assert.ok(
      afterRightPanTransform && afterRightPanTransform !== afterPanTransform,
      "Right-click pan on node should update viewport transform.",
    );
    const rightPanNodeState = await readVisibleNodesState(graph);
    assert.ok(Array.isArray(rightPanNodeState?.nodes) && rightPanNodeState.nodes.length > 0, 'Graph should expose visible nodes after right-click pan.');
    ensureNodesWithinCanvas(rightPanNodeState, 'after right click pan', failures);

    const beforeNodeX = Number.parseFloat((await firstNode.getAttribute('data-vault-graph-node-x')) || '0');
    const beforeNodeY = Number.parseFloat((await firstNode.getAttribute('data-vault-graph-node-y')) || '0');
    const beforeNodesState = await readVisibleNodesState(graph);
    const beforeSpread = nodeSpread(beforeNodesState?.nodes);
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

    await pointerDrag(page, {
      selector: '.vault-graph-preview .vault-graph-view [data-vault-graph-node-id]',
      startX: dragStart.x,
      startY: dragStart.y,
      endX: dragEnd.x,
      endY: dragEnd.y,
      pointerId: 333,
    });
    await page.waitForTimeout(120);

    const afterNodesState = await readVisibleNodesState(graph);
    const afterSpread = nodeSpread(afterNodesState?.nodes);
    const afterDragNodeById = new Map();
    for (const node of afterNodesState?.nodes || []) {
      afterDragNodeById.set(node.id, node);
    }

    if (beforeSpread && afterSpread && beforeSpread.width > 0 && beforeSpread.height > 0) {
      const beforeArea = beforeSpread.width * beforeSpread.height;
      const afterArea = afterSpread.width * afterSpread.height;
      if (afterArea > 0 && beforeArea > 0) {
        assert.ok(
          afterArea >= Math.max(beforeArea * 0.45, 12),
          `Node spread should not collapse after drag (before=${beforeArea.toFixed(1)}, after=${afterArea.toFixed(1)}).`,
        );
      }
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

    // Ensure drag interaction causes a measurable movement in the graph state.

    await wheelZoomAt(page, {
      selector: '.vault-graph-preview .vault-graph-view__canvas',
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      deltaY: -120,
    });
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

    const stressPanSequence = [
      {
        startX: rect.x + rect.width * 0.2,
        startY: rect.y + rect.height * 0.2,
        endX: rect.x - 320,
        endY: rect.y - 220,
      },
      {
        startX: rect.x + rect.width - 30,
        startY: rect.y + rect.height - 26,
        endX: rect.x + rect.width + 290,
        endY: rect.y + rect.height + 250,
      },
    ];

    for (let i = 0; i < stressPanSequence.length; i += 1) {
      const move = stressPanSequence[i];
      await pointerDrag(page, {
        selector: '.vault-graph-preview .vault-graph-view__canvas',
        startX: move.startX,
        startY: move.startY,
        endX: move.endX,
        endY: move.endY,
        pointerId: 410 + i,
      });
      await page.waitForTimeout(100);
    }

    const extremePanState = await readVisibleNodesState(graph);
    ensureNodesWithinCanvas(extremePanState, 'after extreme pan sequence', failures);

    const stressZoomCenterX = rect.x + rect.width * 0.45;
    const stressZoomCenterY = rect.y + rect.height * 0.45;
    for (let i = 0; i < 3; i += 1) {
      await wheelZoomAt(page, {
        selector: '.vault-graph-preview .vault-graph-view__canvas',
        x: stressZoomCenterX,
        y: stressZoomCenterY,
        deltaY: -120,
      });
      await page.waitForTimeout(70);
    }

    for (let i = 0; i < 4; i += 1) {
      await wheelZoomAt(page, {
        selector: '.vault-graph-preview .vault-graph-view__canvas',
        x: stressZoomCenterX,
        y: stressZoomCenterY,
        deltaY: 120,
      });
      await page.waitForTimeout(70);
    }

    const extremeZoomState = await readVisibleNodesState(graph);
    ensureNodesWithinCanvas(extremeZoomState, 'after stress zoom sequence', failures);

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

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

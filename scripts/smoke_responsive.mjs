import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { resolveNotebooksPath } from "./notebook_path.mjs";

const root = process.cwd();
const distDir = join(root, "dist");
const requireExternalNetwork = process.env.VAULT_RESPONSIVE_REQUIRE_EXTERNAL === "1";
const notebooksPath = resolveNotebooksPath();
const errors = [];

const viewports = [
  { name: "mobile-small", width: 360, height: 740 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const pages = [
  { path: "/", label: "home", type: "site" },
  { path: "/lab/", label: "lab-index", type: "site" },
  { path: "/explorar/", label: "explorar", type: "site" },
  { path: "/explorar/intencoes/", label: "explorar-intencoes", type: "site" },
  {
    path: "/meta-e-anexos/workflows/usando-o-lab-notebooks-marimo/",
    label: "lab-doc",
    type: "site",
  },
  { path: `/${notebooksPath}/publishing.html`, label: "notebook-publicacao", type: "notebook" },
  { path: `/${notebooksPath}/graph.html`, label: "notebook-grafo", type: "notebook" },
  { path: `/${notebooksPath}/etl.html`, label: "notebook-etl", type: "notebook" },
  { path: `/${notebooksPath}/feeds.html`, label: "notebook-feeds", type: "notebook" },
  { path: `/${notebooksPath}/outbox.html`, label: "notebook-outbox", type: "notebook" },
  {
    path: `/${notebooksPath}/vault-seed-slides.html`,
    label: "notebook-apresentacao",
    type: "notebook",
  },
  {
    path: `/${notebooksPath}/vault-seed-slides-lite.html`,
    label: "notebook-apresentacao-lite",
    type: "site",
  },
];

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function fail(message) {
  errors.push(message);
}

function isExternalNetworkError(message) {
  return /net::ERR_NETWORK_ACCESS_DENIED|net::ERR_INTERNET_DISCONNECTED|net::ERR_CONNECTION_REFUSED|net::ERR_CONNECTION_TIMED_OUT|Failed to fetch|pyodide\.asm\.js|Failed to load Pyodide|Error bootstrapping TypeError: Failed to fetch dynamically imported module/i.test(
    message,
  );
}

async function resolveDistPath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const relativePath = pathname.replace(/^\/+/, "");
  const candidates = [];

  if (!relativePath) {
    candidates.push(join(distDir, "index.html"));
  } else {
    candidates.push(join(distDir, relativePath));
    if (pathname.endsWith("/")) {
      candidates.push(join(distDir, relativePath, "index.html"));
    } else if (!extname(relativePath)) {
      candidates.push(join(distDir, relativePath, "index.html"));
      candidates.push(join(distDir, `${relativePath}.html`));
    }
  }

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    const rel = relative(distDir, resolved);
    if (!rel.startsWith("..") && rel !== "" && !normalize(rel).startsWith("..")) {
      if (existsSync(resolved)) {
        const entry = await stat(resolved);
        if (entry.isFile()) return resolved;
      }
    }
  }
  return null;
}

async function createStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const filePath = await resolveDistPath(request.url ?? "/");
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const body = await readFile(filePath);
      const type = contentTypes.get(extname(filePath)) ?? "application/octet-stream";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", resolveServer);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("responsive smoke server did not expose a TCP port");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

async function waitForNotebook(page) {
  await page.waitForSelector("marimo-wasm, marimo-island, marimo-code", {
    state: "attached",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
}

async function browserCanReachExternalNetwork(browser) {
  const page = await browser.newPage();

  try {
    const response = await page.goto(
      "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.asm.js",
      { waitUntil: "domcontentloaded", timeout: 20000 },
    );
    return Boolean(response?.ok());
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const documentOverflow = Math.max(doc.scrollWidth, body.scrollWidth) - viewportWidth;
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const overflowRight = rect.right - viewportWidth;
        const overflowLeft = -rect.left;
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className:
            typeof element.className === "string"
              ? element.className.slice(0, 120)
              : "",
          overflow: Math.max(overflowRight, overflowLeft),
        };
      })
      .filter((item) => item.overflow > 2)
      .sort((a, b) => b.overflow - a.overflow)
      .slice(0, 5);

    return { documentOverflow, offenders };
  });

  if (overflow.documentOverflow > 2) {
    fail(
      `${label}: horizontal overflow ${overflow.documentOverflow}px; offenders: ${JSON.stringify(
        overflow.offenders,
      )}`,
    );
  }
}

async function assertStaticGridAlignment(page, target, label) {
  if (target.type !== "site") return;

  const grids = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".vault-card-grid, .vault-metric-grid"))
      .map((grid) => {
        const columns = getComputedStyle(grid).gridTemplateColumns
          .split(" ")
          .filter(Boolean).length;
        const items = Array.from(grid.children)
          .filter((element) => !element.hasAttribute("hidden"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, height: rect.height };
          });
        return { className: grid.className, columns, items };
      })
      .filter((grid) => grid.columns > 1 && grid.items.length >= grid.columns);
  });

  for (const grid of grids) {
    const firstRow = grid.items.slice(0, grid.columns);
    const minTop = Math.min(...firstRow.map((item) => item.top));
    const maxTop = Math.max(...firstRow.map((item) => item.top));
    if (maxTop - minTop > 2) {
      fail(`${label}: ${grid.className} first row is vertically misaligned by ${Math.round(maxTop - minTop)}px`);
    }
  }
}

async function assertVisibleContent(page, target, label) {
  if (target.type === "notebook") {
    const hasNotebookContent = await page.locator("marimo-wasm, marimo-island, marimo-code").count();
    if (!hasNotebookContent) {
      fail(`${label}: Marimo runtime marker is not present`);
    }
    if (target.path.endsWith("vault-seed-slides.html")) {
      const hasFullscreenEnhancer = await page
        .locator("[data-vault-marimo-presentation-fullscreen]")
        .count();
      if (!hasFullscreenEnhancer) {
        fail(`${label}: presentation fullscreen enhancer is not present`);
      }
    }
    return;
  }

  const hasMainContent = await page
    .locator("main, .sl-markdown-content")
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasMainContent) {
    fail(`${label}: main static page content is not visible`);
  }
}

async function assertPresentationSizing(page, target, viewport, label, externalNetworkAvailable) {
  if (!target.path.endsWith("-slides.html") || viewport.width < 1024) {
    return;
  }

  const slideSelector = ".mo-slide-content";
  if (externalNetworkAvailable) {
    await page.waitForSelector(slideSelector, {
      state: "visible",
      timeout: 30000,
    });
  }

  const slideBox = await page
    .locator(slideSelector)
    .first()
    .boundingBox()
    .catch(() => null);
  if (!slideBox) {
    if (externalNetworkAvailable) {
      fail(`${label}: presentation slide content is not visible`);
    }
    return;
  }

  const maxExpectedWidth = Math.min(1248, viewport.width - 48);
  if (slideBox.width > maxExpectedWidth + 2) {
    fail(
      `${label}: presentation slide content too wide (${Math.round(
        slideBox.width,
      )}px > ${maxExpectedWidth}px)`,
    );
  }

  const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
  if (overflowY !== "hidden") {
    fail(`${label}: presentation page should not expose body vertical scroll`);
  }

  if (!externalNetworkAvailable) {
    return;
  }

  const presentationMarker = await page.evaluate(() => document.documentElement.dataset.vaultMarimoPresentation || "");
  if (presentationMarker !== "slides") {
    fail(`${label}: presentation page did not set data-vault-marimo-presentation=slides`);
  }

  const fullscreenLabel = await page
    .locator("[data-vault-marimo-fullscreen-button]")
    .first()
    .evaluate((button) => ({
      text: button.textContent?.trim() ?? "",
      aria: button.getAttribute("aria-label") ?? "",
    }))
    .catch(() => null);
  if (!fullscreenLabel) {
    fail(`${label}: presentation fullscreen icon button was not normalized`);
  } else if (/full\s*screen/i.test(`${fullscreenLabel.text} ${fullscreenLabel.aria}`)) {
    fail(`${label}: presentation fullscreen control still exposes English text`);
  }
}

async function assertLabShellLayout(page, target, viewport, label) {
  if (target.type !== "notebook") {
    return;
  }

  await page.waitForSelector("[data-vault-marimo-navigation]", {
    state: "attached",
    timeout: 10000,
  });
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const sidebar = document.querySelector(".vault-lab-sidebar");
    const notebookRoot = document.querySelector("#root");
    const topbar = document.querySelector(".vault-lab-topbar");
    const chromeWrapper = document.querySelector('#root [data-testid="chrome-wrapper"]');
    const sidebarBox = sidebar?.getBoundingClientRect();
    const rootBox = notebookRoot?.getBoundingClientRect();
    const topbarBox = topbar?.getBoundingClientRect();
    const chromeBox = chromeWrapper?.getBoundingClientRect();

    return {
      state: root.dataset.vaultLabSidebar ?? "",
      sidebar: sidebarBox
        ? { left: sidebarBox.left, right: sidebarBox.right, width: sidebarBox.width }
        : null,
      root: rootBox
        ? {
            left: rootBox.left,
            top: rootBox.top,
            paddingTop: Number.parseFloat(getComputedStyle(notebookRoot).paddingTop) || 0,
            contentTop: rootBox.top + (Number.parseFloat(getComputedStyle(notebookRoot).paddingTop) || 0),
          }
        : null,
      topbar: topbarBox ? { bottom: topbarBox.bottom } : null,
      chrome: chromeBox ? { left: chromeBox.left, top: chromeBox.top, width: chromeBox.width } : null,
    };
  });

  if (!layout.sidebar || !layout.root || !layout.topbar || !layout.chrome) {
    fail(`${label}: Lab shell sidebar, topbar, notebook root, or Marimo chrome wrapper is missing`);
    return;
  }

  if (viewport.width <= 704) {
    if (layout.state !== "collapsed") {
      fail(`${label}: Lab sidebar should default to collapsed on mobile, got ${layout.state}`);
    }
    if (layout.sidebar.right > 2) {
      fail(`${label}: collapsed mobile Lab sidebar still overlaps viewport (${Math.round(layout.sidebar.right)}px visible)`);
    }
  } else {
    if (layout.state !== "expanded") {
      fail(`${label}: Lab sidebar should default to expanded on wider viewports, got ${layout.state}`);
    }
    if (layout.root.left < layout.sidebar.width - 2) {
      fail(`${label}: notebook content overlaps expanded Lab sidebar`);
    }
  }

  if (layout.root.contentTop < layout.topbar.bottom - 2 || layout.chrome.top < layout.topbar.bottom + 16) {
    fail(`${label}: notebook content starts under the Lab topbar`);
  }
}

async function assertPublishedVegaUsesSvg(page, target, label, externalNetworkAvailable) {
  if (target.type !== "notebook" || !externalNetworkAvailable) {
    return;
  }

  const vegaCount = await page.locator("marimo-vega").count().catch(() => 0);
  if (vegaCount === 0) {
    return;
  }

  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll("marimo-vega")).every((element) =>
          String(element.getAttribute("data-embed-options") || "").includes('"renderer":"svg'),
        ),
      null,
      { timeout: 10000 },
    )
    .catch(() => {});

  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll("marimo-vega")).some((element) => {
          const shadow = element.shadowRoot;
          return Boolean(shadow?.querySelector(".chart-wrapper canvas, .chart-wrapper svg"));
        }),
      null,
      { timeout: 30000 },
    )
    .catch(() => {});

  const report = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("marimo-vega")).map((element) => {
      const shadow = element.shadowRoot;
      return {
        embedOptions: element.getAttribute("data-embed-options") || "",
        canvasCount: shadow?.querySelectorAll(".chart-wrapper canvas").length ?? 0,
        svgCount: shadow?.querySelectorAll(".chart-wrapper svg").length ?? 0,
      };
    });
  });

  const missingRenderer = report.filter((item) => !item.embedOptions.includes('"renderer":"svg'));
  if (missingRenderer.length > 0) {
    fail(`${label}: published Vega chart is missing renderer=svg embed options`);
  }

  const canvasCount = report.reduce((total, item) => total + item.canvasCount, 0);
  if (canvasCount > 0) {
    fail(`${label}: published Vega chart rendered ${canvasCount} canvas element(s) instead of SVG`);
  }

  const svgCount = report.reduce((total, item) => total + item.svgCount, 0);
  if (svgCount === 0) {
    fail(`${label}: published Vega chart did not render an SVG chart`);
  }
}

function parsePx(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function assertApprox(label, actualPx, expectedPx, tolerancePx, description) {
  if (actualPx === null) {
    fail(`${label}: ${description} is not computable in CSS for mobile viewport.`);
    return;
  }

  if (Math.abs(actualPx - expectedPx) > tolerancePx) {
    fail(
      `${label}: ${description} expected ~${expectedPx.toFixed(2)}px (tolerance ${tolerancePx}px), got ${actualPx.toFixed(
        2,
      )}px`,
    );
  }
}

async function assertMobileGraphTypography(page, target, viewport, label) {
  if (target.type !== "site" || viewport.width > 44 * 16) {
    return;
  }

  const metrics = await page.evaluate(() => {
    const rootFontPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const heroGraph = document.querySelector('.vault-graph-view--hero');
    const graph = document.querySelector('.vault-graph-view');

    const heroLabel = heroGraph?.querySelector('.vault-graph-view__label--short');
    const heroHover = heroGraph?.querySelector('.vault-graph-view__hover-label');
    const defaultLabel = graph && !heroGraph
      ? graph.querySelector('.vault-graph-view__label--short')
      : document.querySelector('.vault-graph-view:not(.vault-graph-view--hero) .vault-graph-view__label--short');
    const defaultHover = graph && !heroGraph
      ? graph.querySelector('.vault-graph-view__hover-label')
      : document.querySelector('.vault-graph-view:not(.vault-graph-view--hero) .vault-graph-view__hover-label');

    const styleFor = (element, property) => {
      if (!element) return null;
      return getComputedStyle(element).getPropertyValue(property);
    };

    return {
      hasGraph: Boolean(graph),
      rootFontPx,
      heroLabel: styleFor(heroLabel, 'font-size'),
      heroLabelStroke: styleFor(heroLabel, 'stroke-width'),
      heroHover: styleFor(heroHover, 'font-size'),
      heroHoverStroke: styleFor(heroHover, 'stroke-width'),
      defaultLabel: styleFor(defaultLabel, 'font-size'),
      defaultLabelStroke: styleFor(defaultLabel, 'stroke-width'),
      defaultHover: styleFor(defaultHover, 'font-size'),
      defaultHoverStroke: styleFor(defaultHover, 'stroke-width'),
    };
  });

  if (!metrics.hasGraph) {
    return;
  }

  const rootFontPx = metrics.rootFontPx || 16;
  const expectedHeroLabelPx = rootFontPx * 0.75;
  const expectedHeroHoverPx = rootFontPx * 0.9;
  const expectedHeroStrokePx = rootFontPx * 0.15;
  const expectedDefaultLabelPx = rootFontPx * 0.66;
  const expectedDefaultHoverPx = rootFontPx * 0.82;
  const expectedDefaultLabelStrokePx = rootFontPx * 0.125; // 2px/16rem
  const expectedDefaultHoverStrokePx = rootFontPx * 0.13125; // 2.1px/16rem

  if (metrics.heroLabel !== null && metrics.heroLabelStroke !== null) {
    assertApprox(label, parsePx(metrics.heroLabel), expectedHeroLabelPx, 1.5, 'hero mobile label font-size');
    assertApprox(label, parsePx(metrics.heroLabelStroke), expectedHeroStrokePx, 1.5, 'hero mobile label stroke-width');
    assertApprox(label, parsePx(metrics.heroHover), expectedHeroHoverPx, 1.5, 'hero mobile hover label font-size');
    assertApprox(label, parsePx(metrics.heroHoverStroke), expectedHeroStrokePx, 1.5, 'hero mobile hover stroke-width');
  }

  if (metrics.defaultLabel !== null && metrics.defaultLabelStroke !== null) {
    assertApprox(label, parsePx(metrics.defaultLabel), expectedDefaultLabelPx, 1.5, 'default mobile label font-size');
    assertApprox(label, parsePx(metrics.defaultLabelStroke), expectedDefaultLabelStrokePx, 1, 'default mobile label stroke-width');
    assertApprox(label, parsePx(metrics.defaultHover), expectedDefaultHoverPx, 1.5, 'default mobile hover label font-size');
    assertApprox(label, parsePx(metrics.defaultHoverStroke), expectedDefaultHoverStrokePx, 1, 'default mobile hover stroke-width');
  }
}

function boxesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function assertThemeSelectorDoesNotCoverMarimoBadge(page, target, viewport, label) {
  if (target.type !== "notebook") return;

  const badge = await page
    .locator('a:has-text("made with marimo")')
    .first()
    .boundingBox()
    .catch(() => null);
  const selector = await page
    .locator('[data-vault-marimo-theme-selector]')
    .first()
    .boundingBox()
    .catch(() => null);
  if (!badge || !selector) return;
  const labFooter = await page
    .locator('[data-vault-lab-footer]')
    .first()
    .boundingBox()
    .catch(() => null);

  const badgeBox = {
    left: badge.x,
    right: badge.x + badge.width,
    top: badge.y,
    bottom: badge.y + badge.height,
  };
  const selectorBox = {
    left: selector.x,
    right: selector.x + selector.width,
    top: selector.y,
    bottom: selector.y + selector.height,
  };

  if (boxesOverlap(selectorBox, badgeBox)) {
    fail(`${label}: theme selector overlaps the Marimo attribution badge`);
  }
  if (labFooter) {
    const footerBox = {
      left: labFooter.x,
      right: labFooter.x + labFooter.width,
      top: labFooter.y,
      bottom: labFooter.y + labFooter.height,
    };
    if (boxesOverlap(footerBox, badgeBox)) {
      fail(`${label}: Lab footer overlaps the Marimo attribution badge`);
    }
  }

  if (viewport.width <= 704) {
    // force:true bypasses Playwright's actionability check — Marimo's notebook
    // cells (min-w-[400px]) can sit in the same paint layer as the topbar on
    // narrow viewports and block the synthetic click even though the button is
    // visible and the topbar has z-index:10000. This test checks CSS layout
    // (selector vs badge overlap), not pointer interactability.
    await page.locator('[data-vault-marimo-theme-toggle]').first().click({ force: true });
    const openSelector = await page
      .locator('[data-vault-marimo-theme-selector]')
      .first()
      .boundingBox();
    const openSelectorBox = {
      left: openSelector.x,
      right: openSelector.x + openSelector.width,
      top: openSelector.y,
      bottom: openSelector.y + openSelector.height,
    };
    if (boxesOverlap(openSelectorBox, badgeBox)) {
      fail(`${label}: expanded theme selector overlaps the Marimo attribution badge on mobile`);
    }
  }
}

function effectiveTargetForViewport(target, viewport) {
  if (target.path.endsWith("vault-seed-slides.html") && viewport.width < 1024) {
    return { ...target, type: "site" };
  }
  return target;
}

async function run() {
  if (!existsSync(distDir)) {
    throw new Error("dist/ does not exist. Run pnpm run site:responsive.");
  }

  const server = await createStaticServer();
  const browser = await chromium.launch();
  const externalNetworkAvailable = await browserCanReachExternalNetwork(browser);
  const consoleErrors = [];
  const pageErrors = [];

  if (!externalNetworkAvailable && requireExternalNetwork) {
    fail(
      "browser external network unavailable, but VAULT_RESPONSIVE_REQUIRE_EXTERNAL=1. Pyodide hydration cannot be verified.",
    );
  }

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => {
        localStorage.removeItem("vault-seed:marimo-theme-panel");
      });
      const page = await context.newPage();

      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(`${viewport.name}: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        pageErrors.push(`${viewport.name}: ${error.message}`);
      });

      for (const target of pages) {
        const effectiveTarget = effectiveTargetForViewport(target, viewport);
        const label = `${viewport.name} ${target.label}`;
        const response = await page.goto(`${server.baseUrl}${target.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });

        if (!response || !response.ok()) {
          fail(`${label}: HTTP ${response?.status() ?? "no response"}`);
          continue;
        }

        if (effectiveTarget.type === "notebook") {
          await waitForNotebook(page);
        } else {
          await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        }

        await assertVisibleContent(page, effectiveTarget, label);
        await assertNoHorizontalOverflow(page, label);
        await assertStaticGridAlignment(page, effectiveTarget, label);
        await assertMobileGraphTypography(page, effectiveTarget, viewport, label);
        await assertPresentationSizing(
          page,
          effectiveTarget,
          viewport,
          label,
          externalNetworkAvailable,
        );
        await assertLabShellLayout(page, effectiveTarget, viewport, label);
        await assertThemeSelectorDoesNotCoverMarimoBadge(page, effectiveTarget, viewport, label);
        await assertPublishedVegaUsesSvg(page, effectiveTarget, label, externalNetworkAvailable);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  for (const message of consoleErrors) {
    if (
      !/favicon|ResizeObserver loop completed/i.test(message) &&
      (externalNetworkAvailable || !isExternalNetworkError(message))
    ) {
      fail(`console error: ${message}`);
    }
  }
  for (const message of pageErrors) {
    if (externalNetworkAvailable || !isExternalNetworkError(message)) {
      fail(`page error: ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Responsive smoke failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Responsive smoke passed: ${pages.length} pages across ${viewports.length} viewports. ` +
      `externalNetwork=${externalNetworkAvailable ? "verified" : "unavailable-partial"}.`,
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

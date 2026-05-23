import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const distDir = join(root, "dist");
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
  {
    path: "/meta-e-anexos/usando-o-lab-notebooks-marimo/",
    label: "lab-doc",
    type: "site",
  },
  { path: "/lab/publishing.html", label: "notebook-publicacao", type: "notebook" },
  { path: "/lab/graph.html", label: "notebook-grafo", type: "notebook" },
  {
    path: "/lab/vault-seed-slides.html",
    label: "notebook-apresentacao",
    type: "notebook",
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
  await page.waitForTimeout(1500);
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

async function assertVisibleContent(page, target, label) {
  if (target.type === "notebook") {
    const hasNotebookContent = await page.locator("marimo-wasm, marimo-island, marimo-code").count();
    if (!hasNotebookContent) {
      fail(`${label}: Marimo runtime marker is not present`);
    }
    if (target.path.endsWith("vault-seed-slides.html")) {
      const hasExit = await page
        .locator("[data-vault-marimo-presentation-exit]")
        .first()
        .isVisible()
        .catch(() => false);
      if (!hasExit) {
        fail(`${label}: presentation exit control is not visible`);
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

async function run() {
  if (!existsSync(distDir)) {
    throw new Error("dist/ does not exist. Run pnpm run site:responsive.");
  }

  const server = await createStaticServer();
  const browser = await chromium.launch();
  const consoleErrors = [];
  const pageErrors = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
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
        const label = `${viewport.name} ${target.label}`;
        const response = await page.goto(`${server.baseUrl}${target.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });

        if (!response || !response.ok()) {
          fail(`${label}: HTTP ${response?.status() ?? "no response"}`);
          continue;
        }

        if (target.type === "notebook") {
          await waitForNotebook(page);
        } else {
          await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        }

        await assertVisibleContent(page, target, label);
        await assertNoHorizontalOverflow(page, label);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  for (const message of consoleErrors) {
    if (
      !/favicon|ResizeObserver loop completed|net::ERR_NETWORK_ACCESS_DENIED|pyodide\.asm\.js|Failed to load Pyodide|Error bootstrapping TypeError: Failed to fetch dynamically imported module/i.test(
        message,
      )
    ) {
      fail(`console error: ${message}`);
    }
  }
  for (const message of pageErrors) {
    if (
      !/Failed to fetch|pyodide\.asm\.js|Failed to fetch dynamically imported module/i.test(
        message,
      )
    ) {
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
    `Responsive smoke passed: ${pages.length} pages across ${viewports.length} viewports.`,
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

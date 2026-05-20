// Validates a built Astro/Starlight site in dist/.
// Run after `pnpm run site:build`. Catches:
//   - 0-page builds (vault loader misconfiguration)
//   - empty content pages (schema/rendering failures)
//   - placeholder URLs left in HTML (base not configured)
//   - broken internal links (slugify regressions, missing filePath)
//   - missing pagefind index (search broken)

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const distDir = path.join(root, "dist");
const errors = [];
const warnings = [];

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function warnCondition(condition, message) {
  if (!condition) warnings.push(message);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function listHtmlFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listHtmlFiles(full, results);
    } else if (entry.name.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

function distExists(urlPath) {
  // /foo/bar/ → dist/foo/bar/index.html or dist/foo/bar.html
  const clean = urlPath.replace(/^\//, "").replace(/\/$/, "");
  if (!clean) return fs.existsSync(path.join(distDir, "index.html"));
  return (
    fs.existsSync(path.join(distDir, clean, "index.html")) ||
    fs.existsSync(path.join(distDir, clean + ".html")) ||
    fs.existsSync(path.join(distDir, clean))
  );
}

// ── 1. dist/ must exist ───────────────────────────────────────────────────────

requireCondition(
  fs.existsSync(distDir),
  "dist/ does not exist — run pnpm run site:build first.",
);

if (!fs.existsSync(distDir)) {
  console.error("Site smoke failed:");
  console.error("- dist/ does not exist");
  process.exit(1);
}

// ── 2. collect pages ─────────────────────────────────────────────────────────

const allHtml = listHtmlFiles(distDir);
const contentPages = allHtml.filter(
  (f) => !f.endsWith("404.html") && !path.relative(distDir, f).startsWith("_"),
);

requireCondition(
  contentPages.length > 0,
  `No content pages generated. Only found: ${allHtml.map((f) => path.relative(distDir, f)).join(", ")}`,
);

// ── 3. per-page checks ───────────────────────────────────────────────────────

// Known placeholder strings that should never appear in deployed HTML.
// These indicate that a config value was not substituted or defaulted incorrectly.
const PLACEHOLDER_PATTERNS = [
  /href="\/vault-name\//,
  /href="https?:\/\/username\.github\.io/,
];

// Minimum byte count for a page with actual markdown content.
const MIN_CONTENT_BYTES = 3000;

// Pattern to find internal absolute href values in anchor tags only.
// Uses a negative lookbehind to skip <link rel="..."> and similar non-navigation elements.
const internalHrefPattern = /<a\s[^>]*href="(\/[^"#?][^"]*?)"/g;

// Pattern that identifies pages with rendered markdown content.
const hasMarkdownContent = /class="[^"]*sl-markdown-content[^"]*"/;

for (const htmlFile of contentPages) {
  const rel = path.relative(distDir, htmlFile).replace(/\\/g, "/");
  const content = fs.readFileSync(htmlFile, "utf8");

  // 3a. No placeholder URLs.
  for (const pattern of PLACEHOLDER_PATTERNS) {
    requireCondition(
      !pattern.test(content),
      `${rel}: contains placeholder URL matching ${pattern} — check ASTRO_BASE/ASTRO_SITE config.`,
    );
  }

  // 3b. Page must have the Starlight markdown content wrapper.
  requireCondition(
    hasMarkdownContent.test(content),
    `${rel}: missing sl-markdown-content — page may have rendered empty.`,
  );

  // 3c. Page must have meaningful size.
  requireCondition(
    content.length >= MIN_CONTENT_BYTES,
    `${rel}: only ${content.length} bytes — suspiciously small, may be empty.`,
  );

  // 3d. Internal absolute links must resolve.
  for (const [, href] of content.matchAll(internalHrefPattern)) {
    // Skip anchors-only, external-looking, and asset paths.
    if (href.startsWith("/_astro/") || href.startsWith("/pagefind/")) continue;
    if (!distExists(href)) {
      errors.push(`${rel}: internal link ${href} does not resolve in dist/.`);
    }
  }
}

// ── 4. pagefind index must exist ─────────────────────────────────────────────

requireCondition(
  fs.existsSync(path.join(distDir, "pagefind", "pagefind.js")),
  "dist/pagefind/pagefind.js missing — Pagefind search index was not built.",
);

// ── 5. sitemap ───────────────────────────────────────────────────────────────

warnCondition(
  fs.existsSync(path.join(distDir, "sitemap-index.xml")),
  "dist/sitemap-index.xml missing — sitemap not generated (no pages visible to @astrojs/sitemap?).",
);

// ── report ───────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  for (const w of warnings) console.warn(`[warn] ${w}`);
}

if (errors.length > 0) {
  console.error("Site smoke failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `Site smoke passed. ${contentPages.length} content page(s) checked.`,
);

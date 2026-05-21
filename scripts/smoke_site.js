// Validates a built Astro/Starlight site in dist/.
// Run after `pnpm run site:build`. Catches:
//   - 0-page builds (vault loader misconfiguration)
//   - missing root redirect (404 at /)
//   - missing template-contract pages (slugify regressions, status not published)
//   - empty content pages (schema/rendering failures)
//   - placeholder URLs left in HTML (ASTRO_BASE not configured)
//   - broken internal anchor links
//   - empty sidebar (autogenerate failed to match entry IDs to directories)
//   - missing or empty Pagefind index (search broken)

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
  // /foo/bar/ → dist/foo/bar/index.html  or  dist/foo/bar.html
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

// ── 2. root page must exist ───────────────────────────────────────────────────
// Without a root page, users land on 404 when opening the site URL.
// .site/pages/index.astro generates dist/index.html as a redirect to the MOC.

requireCondition(
  fs.existsSync(path.join(distDir, "index.html")),
  "dist/index.html missing — root URL (/) returns 404. Add .site/pages/index.astro.",
);

// ── 3. template-contract pages ────────────────────────────────────────────────
// These slugs are derived from the files that validate_onboarding.js marks as
// required AND that carry status:published in the template. If any is missing,
// something in the build pipeline broke (slugify regression, status field lost,
// vault loader crash, etc.).

const REQUIRED_DIST_PATHS = [
  // Onboarding guides — required by validate_onboarding.js
  "meta-e-anexos/guia-do-jardineiro-digital",
  "meta-e-anexos/seus-primeiros-passos",
  "meta-e-anexos/exploracao-guiada-do-vault",
  "meta-e-anexos/preparando-seu-computador-para-o-vault",
  "meta-e-anexos/configurando-o-obsidian-git",
  "meta-e-anexos/depois-da-recepcao-do-template",
  "meta-e-anexos/moc-vault-seed",
  // Core resource notes
  "recursos/bases",
  "recursos/dataview",
  "recursos/o-que-sao-system-prompts-de-ia",
];

for (const slug of REQUIRED_DIST_PATHS) {
  requireCondition(
    fs.existsSync(path.join(distDir, slug, "index.html")),
    `dist/${slug}/index.html missing — template-contract page not built. Check status:published and slugify output.`,
  );
}

// ── 4. collect content pages ──────────────────────────────────────────────────

const allHtml = listHtmlFiles(distDir);
// Exclude: 404, index (redirect), Starlight internals (_astro/).
const contentPages = allHtml.filter((f) => {
  const rel = path.relative(distDir, f).replace(/\\/g, "/");
  return (
    !rel.endsWith("404.html") &&
    rel !== "index.html" &&
    !rel.startsWith("_")
  );
});

requireCondition(
  contentPages.length > 0,
  `No content pages generated. Only found: ${allHtml
    .map((f) => path.relative(distDir, f))
    .join(", ")}`,
);

// ── 5. per-page checks ────────────────────────────────────────────────────────

// Known placeholder strings that must never appear in deployed HTML.
const PLACEHOLDER_PATTERNS = [
  { re: /href="\/vault-name\//, label: "base-path placeholder /vault-name/" },
  {
    re: /href="https?:\/\/username\.github\.io/,
    label: "site placeholder username.github.io",
  },
];

// Minimum byte size for a page that has real markdown content.
const MIN_CONTENT_BYTES = 3000;

// Matches only anchor <a href="..."> internal absolute links.
const internalHrefPattern = /<a\s[^>]*href="(\/[^"#?][^"]*?)"/g;

// Starlight wraps rendered markdown in this class.
const hasMarkdownContent = /class="[^"]*sl-markdown-content[^"]*"/;

for (const htmlFile of contentPages) {
  const rel = path.relative(distDir, htmlFile).replace(/\\/g, "/");
  const content = fs.readFileSync(htmlFile, "utf8");

  // 5a. No placeholder URLs.
  for (const { re, label } of PLACEHOLDER_PATTERNS) {
    requireCondition(
      !re.test(content),
      `${rel}: contains ${label} — check ASTRO_BASE/ASTRO_SITE configuration.`,
    );
  }

  // 5b. Page must have Starlight's markdown content wrapper.
  requireCondition(
    hasMarkdownContent.test(content),
    `${rel}: missing sl-markdown-content wrapper — page may have rendered empty.`,
  );

  // 5c. Page must have meaningful size.
  requireCondition(
    content.length >= MIN_CONTENT_BYTES,
    `${rel}: only ${content.length} bytes — suspiciously small, content may be missing.`,
  );

  // 5d. Internal anchor links must resolve in dist/.
  for (const [, href] of content.matchAll(internalHrefPattern)) {
    if (href.startsWith("/_astro/") || href.startsWith("/pagefind/")) continue;
    if (!distExists(href)) {
      errors.push(
        `${rel}: internal link ${href} does not resolve in dist/.`,
      );
    }
  }
}

// ── 6. sidebar has nav links ─────────────────────────────────────────────────
// Sample the MOC page (always present) and verify at least one sidebar link
// points into each configured section directory. An empty sidebar means
// autogenerate failed to match entry IDs to directory names.

const SIDEBAR_SECTIONS = ["recursos", "meta-e-anexos"];
const mocHtmlPath = path.join(
  distDir,
  "meta-e-anexos",
  "moc-vault-seed",
  "index.html",
);

if (fs.existsSync(mocHtmlPath)) {
  const mocHtml = fs.readFileSync(mocHtmlPath, "utf8");
  const sidebarStart = mocHtml.indexOf('id="starlight__sidebar"');
  if (sidebarStart !== -1) {
    const sidebarChunk = mocHtml.substring(sidebarStart, sidebarStart + 20000);
    for (const section of SIDEBAR_SECTIONS) {
      const pattern = new RegExp(`href="[^"]*/${section}/[^"]*"`);
      requireCondition(
        pattern.test(sidebarChunk),
        `Sidebar has no links for section '${section}' — autogenerate may have failed. Check filePath format in vault loader.`,
      );
    }
  } else {
    errors.push(
      "meta-e-anexos/moc-vault-seed/index.html: starlight__sidebar element not found.",
    );
  }
}

// ── 8. pagefind index ────────────────────────────────────────────────────────

requireCondition(
  fs.existsSync(path.join(distDir, "pagefind", "pagefind.js")),
  "dist/pagefind/pagefind.js missing — Pagefind search index was not built.",
);

// Pagefind index must have non-trivial size (real content was indexed).
const pagefindIndexDir = path.join(distDir, "pagefind");
if (fs.existsSync(pagefindIndexDir)) {
  const indexFiles = fs
    .readdirSync(pagefindIndexDir)
    .filter((f) => f.endsWith(".pf_index") || f.endsWith(".pf_meta"));
  requireCondition(
    indexFiles.length > 0,
    "dist/pagefind/ has no index files (.pf_index / .pf_meta) — search index may be empty.",
  );
}

// ── 9. sitemap (warning only — requires ASTRO_SITE to be set) ────────────────

warnCondition(
  fs.existsSync(path.join(distDir, "sitemap-index.xml")),
  "dist/sitemap-index.xml missing — sitemap not generated. Set ASTRO_SITE env var to enable.",
);

// ── report ────────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  for (const w of warnings) console.warn(`[warn] ${w}`);
}

if (errors.length > 0) {
  console.error("Site smoke failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `Site smoke passed. ${contentPages.length} content page(s) + root redirect verified.`,
);

// Validates a built Astro/Starlight site in dist/.
// Run after `pnpm run site:build`. Catches:
//   - 0-page builds (vault loader misconfiguration)
//   - missing root redirect (404 at /)
//   - missing template-contract pages (slugify regressions, status not published)
//   - empty content pages (schema/rendering failures)
//   - duplicate <h1> titles (vault loader must strip leading # heading)
//   - protocol-relative URLs like href="//path" (remark-wiki-links base normalization)
//   - placeholder URLs left in HTML (ASTRO_BASE not configured)
//   - broken internal anchor links
//   - empty sidebar or empty sidebar groups (autogenerate failed, dynamic filter broken)
//   - missing mermaid CDN script (head[] injection lost)
//   - missing mermaid code blocks in known diagram pages (pipeline regression)
//   - missing or empty Pagefind index (search broken)

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const distDir = path.join(root, "dist");
const labManifest = JSON.parse(
  fs.readFileSync(path.join(root, ".site", "lab.notebooks.json"), "utf8"),
);
const marimoNotebookPaths = new Set(
  labManifest
    .filter((entry) => entry.publish)
    .map((entry) => `lab/${entry.output}`),
);
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

// Base URL prefix Astro prepends to all internal links (e.g., /vault-seed).
// Links in built HTML are <base>/slug, but files live at dist/slug.
const astroBase = (process.env.ASTRO_BASE || "").replace(/\/$/, "");

function distExists(urlPath) {
  // Strip base prefix so /vault-seed/foo/bar → /foo/bar before resolving.
  let rel = urlPath;
  if (astroBase && rel.startsWith(astroBase + "/")) {
    rel = rel.slice(astroBase.length);
  }
  // /foo/bar/ → dist/foo/bar/index.html  or  dist/foo/bar.html
  const clean = rel.replace(/^\//, "").replace(/\/$/, "");
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
  "recursos/mermaid",
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
// Exclude: 404, index (redirect), Starlight internals (_astro/), and exported
// Marimo notebooks. Marimo HTML is intentionally not rendered by Starlight.
const contentPages = allHtml.filter((f) => {
  const rel = path.relative(distDir, f).replace(/\\/g, "/");
  return (
    !rel.endsWith("404.html") &&
    rel !== "index.html" &&
    !rel.startsWith("_") &&
    !isMarimoNotebook(rel)
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

function isMarimoNotebook(relPath) {
  return marimoNotebookPaths.has(relPath);
}

function hasMarimoRuntime(content) {
  return content.includes("<marimo-wasm") && content.includes('data-marimo="true"');
}

for (const htmlFile of allHtml) {
  const rel = path.relative(distDir, htmlFile).replace(/\\/g, "/");
  if (!isMarimoNotebook(rel)) continue;
  const content = fs.readFileSync(htmlFile, "utf8");

  requireCondition(
    hasMarimoRuntime(content),
    `${rel}: missing Marimo WASM runtime markers — notebook export may be invalid.`,
  );
  requireCondition(
    content.includes("./assets/"),
    `${rel}: missing relative assets references — notebook export may not load in /lab/.`,
  );
}

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

  // 5e. No duplicate <h1> — Starlight renders one from frontmatter title; the
  // vault loader must strip any leading # heading from the markdown body.
  const h1Count = (content.match(/<h1[\s>]/g) || []).length;
  requireCondition(
    h1Count <= 1,
    `${rel}: ${h1Count} <h1> elements found — duplicate title. Check H1-stripping ` +
      `regex in vault loader (content.config.ts).`,
  );

  // 5f. No protocol-relative URLs (double-slash like //path). These are caused
  // by remarkWikiLinks when base is '/' and the slug is not prefixed correctly.
  requireCondition(
    !/<a[^>]+href="\/\//.test(content),
    `${rel}: contains a protocol-relative URL (href="//...") — check base normalization ` +
      `in remark-wiki-links.ts.`,
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
    const sidebarEnd = mocHtml.indexOf("</nav>", sidebarStart);
    const sidebarChunk = mocHtml.substring(sidebarStart, sidebarEnd);

    // 6a. Known-populated sections must have at least one nav link.
    for (const section of SIDEBAR_SECTIONS) {
      const pattern = new RegExp(`href="[^"]*/${section}/[^"]*"`);
      requireCondition(
        pattern.test(sidebarChunk),
        `Sidebar has no links for section '${section}' — autogenerate may have failed. ` +
          `Common cause: backslash paths in collectPublishedSlugs on Windows, or filePath ` +
          `format mismatch in vault loader.`,
      );
    }

    // 6b. No sidebar group (<details>) may be completely empty.
    // An empty group means the dynamic filter is producing sections that have
    // no matching entries — the section should have been excluded instead.
    const detailsChunks = [...sidebarChunk.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)];
    for (const [full, inner] of detailsChunks) {
      const hasLink = /<a [^>]*href/.test(inner);
      requireCondition(
        hasLink,
        `Sidebar contains an empty group (no nav links inside a <details> block). ` +
          `The sidebar filter in astro.config.mjs may be including sections with no published notes.`,
      );
    }
  } else {
    errors.push(
      "meta-e-anexos/moc-vault-seed/index.html: starlight__sidebar element not found.",
    );
  }

  // 6c. Mermaid client-side script must be present in the head.
  // Catches regressions in the astro.config.mjs head[] injection.
  requireCondition(
    mocHtml.includes("mermaid.esm.min.mjs"),
    "Mermaid CDN script not found in page head — check head[] config in astro.config.mjs.",
  );
}

// ── 7. Mermaid code blocks present in diagram pages ──────────────────────────
// These pages are known to contain mermaid blocks.  Verifies that the blocks
// survived the remark/Expressive Code pipeline and will be available for the
// client-side renderer to replace.  Does NOT verify actual SVG rendering
// (that requires a headless browser).

const MERMAID_PAGES = [
  "recursos/mermaid",
  "meta-e-anexos/diagramas/exemplos",
  "meta-e-anexos/visualizacao-do-fluxo-do-vault",
];

for (const slug of MERMAID_PAGES) {
  const htmlPath = path.join(distDir, slug, "index.html");
  if (!fs.existsSync(htmlPath)) {
    // Page existence already caught by REQUIRED_DIST_PATHS for contract pages;
    // skip the mermaid block check if the file is simply absent.
    continue;
  }
  const pageHtml = fs.readFileSync(htmlPath, "utf8");
  requireCondition(
    pageHtml.includes('data-language="mermaid"'),
    `${slug}/index.html: no mermaid code blocks found — diagram content may have been lost during build.`,
  );
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

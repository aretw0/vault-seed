// Validates that Mermaid diagram source can be correctly reconstructed from
// the static HTML produced by the Expressive Code pipeline.
//
// Expressive Code wraps each source line in <div class="ec-line">.  The render
// script joins these with \n to rebuild the source.  These tests verify that
// invariant holds in the built output, so regressions in the extraction logic
// are caught before they reach the browser.
//
// Run after `pnpm run site:build`.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const distDir = path.join(root, "dist");

// Known mermaid diagram types the validator accepts.
const KNOWN_TYPES = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "gantt",
  "pie",
  "gitGraph",
  "mindmap",
  "timeline",
];

// Pages that must contain at least one mermaid block.
// recursos/mermaid is vault-seed reference content (status: published) and is
// verified here. The smoke_template note-status contract enforces that it stays
// published. Pages in 99 - Meta e Anexos/ are developer-only (removed by
// initialize.yml) and are also verified here.
const MERMAID_PAGES = [
  "recursos/mermaid",
  "meta-e-anexos/diagramas/exemplos",
  "meta-e-anexos/referencia/visualizacao-do-fluxo-do-vault",
];

/**
 * Extracts Mermaid source strings from a built HTML page, simulating exactly
 * what the browser render script does: join .ec-line textContent with \n.
 */
function extractMermaidSources(html) {
  const sources = [];
  const preRe = /<pre\s[^>]*data-language="mermaid"[^>]*>([\s\S]*?)<\/pre>/g;
  let preMatch;
  while ((preMatch = preRe.exec(html)) !== null) {
    const preInner = preMatch[1];
    // Each ec-line div encloses one source line.  The class may be exactly
    // "ec-line" or "ec-line <extras>", so the closing quote is optional extras.
    // (?:\s[^"]*)? makes the extra-classes part optional.
    const lineRe = /<div class="ec-line(?:\s[^"]*)?\"[^>]*>([\s\S]*?)<\/div><\/div>/g;
    const lines = [];
    let lineMatch;
    while ((lineMatch = lineRe.exec(preInner)) !== null) {
      // Strip HTML tags, then decode common HTML entities to plain text.
      const text = lineMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
          String.fromCodePoint(parseInt(h, 16)),
        )
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');
      lines.push(text);
    }
    if (lines.length > 0) {
      sources.push(lines.join("\n").trim());
    }
  }
  return sources;
}

describe("mermaid render contract", () => {
  test("dist/ exists (run site:build first)", () => {
    assert.ok(
      fs.existsSync(distDir),
      "dist/ not found — run pnpm run site:build before this test",
    );
  });

  for (const slug of MERMAID_PAGES) {
    describe(`page: ${slug}`, () => {
      const htmlPath = path.join(distDir, slug, "index.html");

      test("page exists in dist", () => {
        assert.ok(
          fs.existsSync(htmlPath),
          `${slug}/index.html not found in dist — check status:published and vault loader`,
        );
      });

      test("ec-line extraction produces valid mermaid sources", () => {
        if (!fs.existsSync(htmlPath)) return; // guarded by previous test
        const html = fs.readFileSync(htmlPath, "utf8");
        const sources = extractMermaidSources(html);

        assert.ok(
          sources.length > 0,
          `${slug}: no mermaid blocks found — diagram content lost in pipeline`,
        );

        for (const [i, source] of sources.entries()) {
          // Must be multi-line — single-line means ec-line extraction failed.
          assert.ok(
            source.includes("\n"),
            `${slug} diagram ${i + 1}: source has no newlines — ec-line extraction broken (pre.textContent regression)`,
          );

          // Must start with a known diagram type declaration.
          const firstLine = source.split("\n")[0].trim();
          const knownType = KNOWN_TYPES.some((t) => firstLine.startsWith(t));
          assert.ok(
            knownType,
            `${slug} diagram ${i + 1}: first line "${firstLine}" is not a known diagram type — source reconstruction may be wrong`,
          );
        }
      });
    });
  }

  describe("render script uses ec-line extraction", () => {
    test("astro.config.mjs uses .ec-line querySelectorAll, not pre.textContent directly", () => {
      const configPath = path.join(root, "astro.config.mjs");
      const config = fs.readFileSync(configPath, "utf8");
      assert.ok(
        config.includes('querySelectorAll(".ec-line")') || config.includes("querySelectorAll('.ec-line')"),
        "astro.config.mjs: mermaid render script must use .ec-line querySelectorAll to extract source lines",
      );
    });
  });
});

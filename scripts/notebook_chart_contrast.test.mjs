import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Chart marks (bars/points/lines/areas) carry a fixed color chosen in Python:
// the WASM worker that renders them cannot read the page theme, so a single
// value must stay legible on BOTH the light and the dark notebook background.
// Text marks are excluded — the marimo-vault.css `.vega-embed svg text` rule
// retints them to the active foreground, so their authored color is cosmetic.
//
// This guards the regression where single-series bars used `#1b5e3b`
// (~2.5:1 on the dark background) and vanished in dark mode.

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIN_GRAPHIC_CONTRAST = 3.0; // WCAG 1.4.11 non-text contrast

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }) {
  const chan = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function readDefaultBackground(css, themeValue) {
  // The default (verde-jardim) palette sets --background in a comma-grouped
  // block; ignore palette-qualified blocks and rules without --background.
  const blocks = css.matchAll(/([^{}]+)\{([^}]+)\}/g);
  for (const [, selector, body] of blocks) {
    if (!selector.includes(`data-vault-marimo-theme="${themeValue}"`)) continue;
    if (selector.includes("data-vault-marimo-palette")) continue;
    const bg = body.match(/--background:\s*(#[0-9a-fA-F]{3,6})\b/);
    if (bg) return bg[1];
  }
  assert.fail(`marimo-vault.css must set --background for the ${themeValue} default theme`);
}

function listNotebookSources() {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, ".site", "lab.notebooks.json"), "utf8"),
  );
  return manifest
    .map((entry) => join(ROOT, entry.source))
    .filter((path) => existsSync(path));
}

function collectMarkColors(source) {
  // Walk marks and color literals in source order so each color is attributed
  // to the nearest preceding `.mark_<type>(`.
  const token = /\.mark_(\w+)\s*\(|_?alt\.value\(\s*"(#[0-9a-fA-F]{6})"\s*\)/g;
  const findings = [];
  let currentMark = null;
  let match;
  while ((match = token.exec(source)) !== null) {
    if (match[1]) {
      currentMark = match[1];
    } else if (match[2]) {
      findings.push({ mark: currentMark, color: match[2] });
    }
  }
  return findings;
}

test("notebook chart marks stay legible on both light and dark backgrounds", () => {
  const css = readFileSync(
    join(ROOT, ".site", "styles", "marimo-vault.css"),
    "utf8",
  );
  const lightBg = readDefaultBackground(css, "light");
  const darkBg = readDefaultBackground(css, "dark");

  const failures = [];
  for (const file of listNotebookSources()) {
    const source = readFileSync(file, "utf8");
    const rel = file.slice(ROOT.length + 1).replaceAll("\\", "/");
    for (const { mark, color } of collectMarkColors(source)) {
      if (mark === "text") continue; // retinted by .vega-embed svg text
      const onDark = contrastRatio(color, darkBg);
      const onLight = contrastRatio(color, lightBg);
      if (onDark < MIN_GRAPHIC_CONTRAST || onLight < MIN_GRAPHIC_CONTRAST) {
        failures.push({
          file: rel,
          mark: mark ?? "(unknown)",
          color,
          onDark: Number(onDark.toFixed(2)),
          onLight: Number(onLight.toFixed(2)),
        });
      }
    }
  }

  assert.equal(
    failures.length,
    0,
    `Chart mark colors must clear ${MIN_GRAPHIC_CONTRAST}:1 on both backgrounds (use #2d7a4d or a status color):\n${JSON.stringify(
      failures,
      null,
      2,
    )}`,
  );
});

test("contrast guard catches the known dark-mode regression", () => {
  // #1b5e3b on #111310 was the failing case; #2d7a4d is the dual-safe fix.
  assert.ok(contrastRatio("#1b5e3b", "#111310") < MIN_GRAPHIC_CONTRAST);
  assert.ok(contrastRatio("#2d7a4d", "#111310") >= MIN_GRAPHIC_CONTRAST);
  assert.ok(contrastRatio("#2d7a4d", "#f7f5f0") >= MIN_GRAPHIC_CONTRAST);
});

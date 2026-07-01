import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Lab charts must never push the page wider than the mobile viewport.
//
// Two layers, both verified here:
//   1. The shared helper `lab_altair_chart` asks each chart to follow its
//      container width (`width="container"`) so charts fit by default.
//   2. marimo-vault.css contains the chart HOST (`marimo-vega` / `.vega-embed`)
//      with `max-width: 100%` + `overflow-x: auto`. This is the variance-proof
//      guarantee: even a chart whose left axis labels are intrinsically wide
//      (the "Distribuição de intenção" bar was the worst offender) scrolls
//      INSIDE its own box instead of expanding the page. Future charts are
//      covered without per-chart tuning.

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const HELPER_COPIES = [
  join(ROOT, "99 - Meta e Anexos", "Notebooks", "_lab_notebook_runtime.py"),
  join(ROOT, "packages", "lab-runtime", "src", "dgk_lab_runtime", "__init__.py"),
];

function extractHelperBody(source) {
  const start = source.indexOf("def lab_altair_chart(chart):");
  expect(start, "lab_altair_chart must exist in the helper source").not.toBe(-1);
  // Body runs until the next top-of-function marker after the definition.
  const rest = source.slice(start);
  const next = rest.slice(1).search(/\n\s*def lab_altair_status_color\(/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test("lab_altair_chart asks charts to follow their container width (both copies)", () => {
  for (const file of HELPER_COPIES) {
    const body = extractHelperBody(readFileSync(file, "utf8"));
    const rel = file.slice(ROOT.length + 1).replaceAll("\\", "/");
    expect(body, `${rel}: lab_altair_chart must apply width="container" so charts fit the mobile viewport`).toMatch(/width\s*=\s*"container"/);
    expect(body, `${rel}: lab_altair_chart must keep the single-series brand color`).toMatch(/configure_mark\(\s*color=LAB_CHART_PALETTE\["primary"\]\s*\)/);
  }
});

test("marimo-vault.css contains the chart host so a wide chart cannot expand the page", () => {
  const css = readFileSync(
    join(ROOT, ".site", "styles", "marimo-vault.css"),
    "utf8",
  );

  // Find every rule block that targets the chart host and check containment.
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]+)\}/g)];
  const hostBlocks = blocks.filter(
    ([, selector]) =>
      /\bmarimo-vega\b/.test(selector) || /\.vega-embed\b/.test(selector),
  );
  expect(hostBlocks.length > 0, "marimo-vault.css must style the chart host (marimo-vega / .vega-embed)").toBeTruthy();

  const containing = hostBlocks.find(
    ([, , body]) =>
      /max-width:\s*100%/.test(body) && /overflow-x:\s*auto/.test(body),
  );
  expect(containing, "a marimo-vega / .vega-embed rule must set `max-width: 100%` and `overflow-x: auto` so an oversized chart scrolls inside its box instead of expanding the page").toBeTruthy();
});

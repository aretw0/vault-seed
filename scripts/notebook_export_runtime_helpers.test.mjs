import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { replaceImportAndInjectRuntimeHelpers } from "./notebook_export_runtime_helpers.mjs";

// Minimal helper source: satisfies extractFallbackSource (needs except ImportError: block).
const MINIMAL_HELPER = `\
try:
    from dgk_lab_runtime import *
except ImportError:
    def lab_runtime_context():
        return {}
    def load_lab_manifest():
        return []
`;

function makeNotebook({ appArgs = 'width="medium"', extraCells = "" } = {}) {
  return `\
import marimo

__generated_with = "0.1.0"
app = marimo.App(${appArgs})


@app.cell
def _():
    from _lab_notebook_runtime import (
        lab_runtime_context,
        load_lab_manifest,
    )
    return lab_runtime_context, load_lab_manifest
${extraCells}

if __name__ == "__main__":
    app.run()
`;
}

describe("replaceImportAndInjectRuntimeHelpers — App() call variants", () => {
  test("single-line App(): helper injected after app = marimo.App(...)", () => {
    const source = makeNotebook({ appArgs: 'width="medium"' });
    const result = replaceImportAndInjectRuntimeHelpers(source, {
      runtimeHelperSource: MINIMAL_HELPER,
    });

    const appCallEnd = result.indexOf("app = marimo.App(") + result.slice(result.indexOf("app = marimo.App(")).indexOf("\n");
    const firstCellPos = result.indexOf("@app.cell");
    expect(appCallEnd < firstCellPos, "helper @app.cell must come after the app = marimo.App(...) line").toBeTruthy();
    expect(result, "runtime import must be removed").not.toMatch(/from _lab_notebook_runtime import/);
  });

  test("multi-line App(): helper injected after closing ) — e.g. presentation notebooks with layout_file", () => {
    const source = makeNotebook({
      appArgs: '\n    width="medium",\n    layout_file="layouts/foo.slides.json",\n',
    });
    const result = replaceImportAndInjectRuntimeHelpers(source, {
      runtimeHelperSource: MINIMAL_HELPER,
    });

    // The App() constructor block must be intact in the output.
    expect(result, "multi-line App() call must remain intact").toMatch(/app = marimo\.App\(\n\s+width="medium",\n\s+layout_file="layouts\/foo\.slides\.json",\n\)/);

    // No @app.cell may appear before the closing ) of the App call.
    const closingParen = result.indexOf("app = marimo.App(") + result.slice(result.indexOf("app = marimo.App(")).indexOf("\n)") + 2;
    const firstCell = result.indexOf("@app.cell");
    expect(firstCell > closingParen, "@app.cell must appear after the closing ) of marimo.App()").toBeTruthy();

    expect(result, "runtime import must be removed").not.toMatch(/from _lab_notebook_runtime import/);
    expect(result, "used helpers must be returned").toMatch(/return lab_runtime_context, load_lab_manifest/);
  });

  test("multi-line App() with nested parens in args does not break insertion point", () => {
    const source = makeNotebook({
      appArgs: '\n    width="medium",\n    css_file=os.path.join("a", "b.css"),\n',
    });
    const result = replaceImportAndInjectRuntimeHelpers(source, {
      runtimeHelperSource: MINIMAL_HELPER,
    });

    // Nested parens (os.path.join(...)) must not confuse paren-depth tracking.
    expect(result, "App() call with nested parens must remain intact").toMatch(/app = marimo\.App\(\n\s+width="medium",\n\s+css_file=os\.path\.join\("a", "b\.css"\),\n\)/);

    // The outer ) of a multi-line App() call sits on its own line (\n)\n).
    // Helper cell must appear after that, not inside the App() call.
    const appStart = result.indexOf("app = marimo.App(");
    const outerClose = result.indexOf("\n)\n", appStart);
    const firstCell = result.indexOf("@app.cell");
    expect(outerClose >= 0, "multi-line App() closing ) must be on its own line").toBeTruthy();
    expect(firstCell > outerClose, "helper @app.cell must be inserted after the outer ) of marimo.App()").toBeTruthy();
  });
});

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const notebookPath = join(
	ROOT,
	"99 - Meta e Anexos",
	"Notebooks",
	"etl-demo.py",
);
const runtimeHelperPath = join(
	ROOT,
	"99 - Meta e Anexos",
	"Notebooks",
	"_lab_notebook_runtime.py",
);

function transformEtcDemo() {
	return replaceImportAndInjectRuntimeHelpers(
		readFileSync(notebookPath, "utf8"),
		{
			runtimeHelperSource: readFileSync(runtimeHelperPath, "utf8"),
		},
	);
}

test("notebook runtime helpers are injected after marimo app creation", () => {
	const transformed = transformEtcDemo();
	const appIndex = transformed.indexOf("app = marimo.App");
	const helperCellIndex = transformed.indexOf("@app.cell");
	const helperDefinitionIndex = transformed.indexOf("def _():");

	expect(appIndex, "transformed notebook should keep app setup").not.toBe(-1);
	expect(helperCellIndex, "runtime helper cell should be injected").not.toBe(-1);
	expect(helperDefinitionIndex, "runtime helper function should be injected").not.toBe(-1);
	expect(appIndex < helperCellIndex, "the first @app.cell must appear after app = marimo.App(...) for Pyodide").toBeTruthy();
	expect(helperCellIndex < helperDefinitionIndex, "helper definition should be inside the injected marimo cell").toBeTruthy();
	expect(transformed, "injected helper cell should remain parseable Python").not.toMatch(/@app\.cell\n\n/);
	expect(transformed.slice(helperDefinitionIndex), "runtime context helper should be bundled into the injected cell").toMatch(/def lab_runtime_context\(/);
	expect(transformed, "wrapper should not duplicate imports already present in runtime helper source").not.toMatch(/import json\n\s+import os\n\n\s+import json/);
});

test("notebook export strips UTF-8 BOM before Marimo parses the temporary source", () => {
	const transformed = replaceImportAndInjectRuntimeHelpers(
		`\uFEFF${makeNotebook()}`,
		{
			runtimeHelperSource: MINIMAL_HELPER,
		},
	);

	expect(transformed.charCodeAt(0), "exported notebook source must not start with BOM").toBe("i".charCodeAt(0));
	expect(transformed).toMatch(/^import marimo/);
});

test("notebook runtime helper import is removed from exported source", () => {
	const transformed = transformEtcDemo();

	expect(transformed, "exported notebook source must be self-contained for browser runtime").not.toMatch(/from _lab_notebook_runtime import/);
	expect(transformed, "injected helper cell should return the helpers imported by the notebook").toMatch(/return clean_lab_text, extract_local_image_text, fetch_local_feed, fetch_local_url_text, fingerprint_data, get_local_secret, lab_runtime_context, load_lab_manifest, read_lab_dataset, read_lab_json, read_local_text_file, scrape_local_page_text, write_local_dataframe_snapshot, write_local_json_snapshot/);
	expect(transformed, "multiline helper import members must also be removed from exported source").not.toMatch(/^\s+lab_runtime_context,\s*$/m);
});

test("wasm async fetch helpers are present in injected cell body", () => {
	const transformed = transformEtcDemo();
	expect(transformed, "fetch_wasm_json must be present in the injected helper cell").toMatch(/async def fetch_wasm_json\(/);
	expect(transformed, "fetch_wasm_feed must be present in the injected helper cell").toMatch(/async def fetch_wasm_feed\(/);
	expect(transformed, "fetch_wasm_json and fetch_wasm_feed must use pyodide pyfetch").toMatch(/pyfetch/);
});

test("injected runtime helper cell must not contain wildcard imports", () => {
	// Marimo's AST parser converts cells with `import *` to app._unparsable_cell(),
	// which is never executed in the WASM runtime — causing NameError in dependent cells.
	const transformed = transformEtcDemo();
	expect(transformed, "injected helper cell must not use wildcard imports that marimo cannot statically analyze").not.toMatch(/import \*/);
	expect(transformed, "injected helper cell must not produce an _unparsable_cell in the exported notebook").not.toMatch(/_unparsable_cell/);
	expect(transformed, "inline fallback functions must be present in the injected cell").toMatch(/def is_pyodide_runtime\(\)/);
});

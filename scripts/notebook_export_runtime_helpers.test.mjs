import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { replaceImportAndInjectRuntimeHelpers } from "./notebook_export_runtime_helpers.mjs";

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

	assert.notEqual(appIndex, -1, "transformed notebook should keep app setup");
	assert.notEqual(
		helperCellIndex,
		-1,
		"runtime helper cell should be injected",
	);
	assert.notEqual(
		helperDefinitionIndex,
		-1,
		"runtime helper function should be injected",
	);
	assert.ok(
		appIndex < helperCellIndex,
		"the first @app.cell must appear after app = marimo.App(...) for Pyodide",
	);
	assert.ok(
		helperCellIndex < helperDefinitionIndex,
		"helper definition should be inside the injected marimo cell",
	);
	assert.doesNotMatch(
		transformed,
		/@app\.cell\n\n/,
		"injected helper cell should remain parseable Python",
	);
	assert.match(
		transformed.slice(helperDefinitionIndex),
		/def lab_runtime_context\(/,
		"runtime context helper should be bundled into the injected cell",
	);
	assert.doesNotMatch(
		transformed,
		/import json\n\s+import os\n\n\s+import json/,
		"wrapper should not duplicate imports already present in runtime helper source",
	);
});

test("notebook runtime helper import is removed from exported source", () => {
	const transformed = transformEtcDemo();

	assert.doesNotMatch(
		transformed,
		/from _lab_notebook_runtime import/,
		"exported notebook source must be self-contained for browser runtime",
	);
	assert.match(
		transformed,
		/return clean_lab_text, extract_local_image_text, fetch_local_feed, fetch_local_url_text, fingerprint_data, get_local_secret, lab_runtime_context, load_lab_manifest, read_lab_dataset, read_lab_json, read_local_text_file, scrape_local_page_text, write_local_dataframe_snapshot, write_local_json_snapshot/,
		"injected helper cell should return the helpers imported by the notebook",
	);
	assert.doesNotMatch(
		transformed,
		/^\s+lab_runtime_context,\s*$/m,
		"multiline helper import members must also be removed from exported source",
	);
});

test("wasm async fetch helpers are present in injected cell body", () => {
	const transformed = transformEtcDemo();
	assert.match(
		transformed,
		/async def fetch_wasm_json\(/,
		"fetch_wasm_json must be present in the injected helper cell",
	);
	assert.match(
		transformed,
		/async def fetch_wasm_feed\(/,
		"fetch_wasm_feed must be present in the injected helper cell",
	);
	assert.match(
		transformed,
		/pyfetch/,
		"fetch_wasm_json and fetch_wasm_feed must use pyodide pyfetch",
	);
});

test("injected runtime helper cell must not contain wildcard imports", () => {
	// Marimo's AST parser converts cells with `import *` to app._unparsable_cell(),
	// which is never executed in the WASM runtime — causing NameError in dependent cells.
	const transformed = transformEtcDemo();
	assert.doesNotMatch(
		transformed,
		/import \*/,
		"injected helper cell must not use wildcard imports that marimo cannot statically analyze",
	);
	assert.doesNotMatch(
		transformed,
		/_unparsable_cell/,
		"injected helper cell must not produce an _unparsable_cell in the exported notebook",
	);
	assert.match(
		transformed,
		/def is_pyodide_runtime\(\)/,
		"inline fallback functions must be present in the injected cell",
	);
});

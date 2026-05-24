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
	const helperDefinitionIndex = transformed.indexOf(
		"def _lab_notebook_runtime_helpers():",
	);

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
		/return load_lab_manifest, read_lab_json/,
		"injected helper cell should return the helpers imported by the notebook",
	);
});

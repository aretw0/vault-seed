import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const ANALYSIS_NOTEBOOKS = [
	"99 - Meta e Anexos/Notebooks/analise-publicacao.py",
	"99 - Meta e Anexos/Notebooks/analise-grafo.py",
	"99 - Meta e Anexos/Notebooks/analise-feeds.py",
	"99 - Meta e Anexos/Notebooks/analise-outbox.py",
	"99 - Meta e Anexos/Notebooks/etl-demo.py",
];

/**
 * Finds @app.cell bodies that have 2+ top-level mo.*() expression calls.
 *
 * In marimo, only the last evaluated expression in a cell is shown as visual
 * output. Multiple sequential mo.md() / mo.ui.*() calls silently discard
 * all but the last. The correct pattern is mo.vstack([...]) when multiple
 * elements must appear together.
 *
 * Detection relies on indentation: marimo always generates 4-space-indented
 * function bodies. Top-level calls are at exactly 4 spaces; calls inside
 * mo.vstack([...]) arguments are at 8+ spaces and do not match.
 *
 * Exclusion: mo.output.append() is the imperative multi-output API and
 * is intentionally called multiple times.
 */
function cellsWithMultipleTopLevelMoCalls(source) {
	const issues = [];
	const cellBodies = source.split(/^@app\.cell/m).slice(1);

	for (let i = 0; i < cellBodies.length; i++) {
		const topLevelMoCalls = cellBodies[i]
			.split("\n")
			.filter(
				(line) =>
					/^    mo\.[a-zA-Z]/.test(line) && !/^    mo\.output\./.test(line),
			);

		if (topLevelMoCalls.length > 1) {
			issues.push({ cellIndex: i, calls: topLevelMoCalls });
		}
	}

	return issues;
}

// ── unit tests for the lint utility ──────────────────────────────────────────

test("lint: detects two sequential top-level mo.md() calls in same cell", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo):",
		'    mo.md("Level 1")',
		'    mo.md("Level 2")',
		"    return",
	].join("\n");

	const issues = cellsWithMultipleTopLevelMoCalls(src);
	assert.equal(issues.length, 1, "one bad cell");
	assert.equal(issues[0].calls.length, 2);
});

test("lint: mo.vstack wrapping does not trigger false positive", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo):",
		"    mo.vstack([",
		'        mo.md("A"),',
		'        mo.md("B"),',
		"    ])",
		"    return",
	].join("\n");

	assert.equal(
		cellsWithMultipleTopLevelMoCalls(src).length,
		0,
		"mo.vstack body is at 8-space indent — no false positive",
	);
});

test("lint: single mo.md() call is not flagged", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo):",
		'    mo.md("Hello")',
		"    return",
	].join("\n");

	assert.equal(cellsWithMultipleTopLevelMoCalls(src).length, 0);
});

test("lint: mo.ui.table after heading in same cell is detected", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo, df):",
		'    mo.md("## Section")',
		"    mo.ui.table(df)",
		"    return",
	].join("\n");

	const issues = cellsWithMultipleTopLevelMoCalls(src);
	assert.equal(issues.length, 1);
});

test("lint: mo.output.append() is excluded (imperative multi-output API)", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo):",
		'    mo.output.append(mo.md("A"))',
		'    mo.output.append(mo.md("B"))',
		"    return",
	].join("\n");

	assert.equal(
		cellsWithMultipleTopLevelMoCalls(src).length,
		0,
		"mo.output.append is the valid imperative API",
	);
});

// ── contract tests against actual notebooks ───────────────────────────────────

for (const relPath of ANALYSIS_NOTEBOOKS) {
	const name = relPath.split("/").pop();
	test(`notebook cell output contract: ${name}`, () => {
		const source = readFileSync(join(ROOT, relPath), "utf8");
		const issues = cellsWithMultipleTopLevelMoCalls(source);
		assert.equal(
			issues.length,
			0,
			`${name} has cells with multiple unguarded top-level mo.*() calls ` +
				`(only the last would be shown in the browser):\n` +
				issues
					.map(
						({ cellIndex, calls }) =>
							`  cell ${cellIndex}:\n` +
							calls.map((l) => `    ${l.trim()}`).join("\n"),
					)
					.join("\n"),
		);
	});
}

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Discovers all notebook .py files under the Notebooks directory, excluding
 * files whose names start with "_" (runtime helpers, private modules).
 * Returns forward-slash relative paths from ROOT.
 */
function discoverNotebooks(root) {
	const notebooksDir = join(root, "99 - Meta e Anexos", "Notebooks");
	if (!existsSync(notebooksDir)) return [];
	const results = [];
	function walk(absDir, relDir) {
		for (const entry of readdirSync(absDir, { withFileTypes: true })) {
			const absEntry = join(absDir, entry.name);
			const relEntry = `${relDir}/${entry.name}`;
			if (entry.isDirectory()) {
				walk(absEntry, relEntry);
			} else if (entry.name.endsWith(".py") && !entry.name.startsWith("_")) {
				results.push(relEntry);
			}
		}
	}
	walk(notebooksDir, "99 - Meta e Anexos/Notebooks");
	return results;
}

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
 * Exclusions:
 *   - mo.output.append() — imperative multi-output API, intentionally multi-call.
 *   - mo.stop()          — early-exit gate; may precede the actual output call.
 */
function cellsWithMultipleTopLevelMoCalls(source) {
	const issues = [];
	const cellBodies = source.split(/^@app\.cell/m).slice(1);

	for (let i = 0; i < cellBodies.length; i++) {
		const topLevelMoCalls = cellBodies[i]
			.split("\n")
			.filter(
				(line) =>
					/^    mo\.[a-zA-Z]/.test(line) &&
					!/^    mo\.output\./.test(line) &&
					!/^    mo\.stop\(/.test(line),
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

test("lint: mo.stop() before another mo.*() is not flagged (early-exit gate)", () => {
	const src = [
		"import marimo",
		"app = marimo.App()",
		"",
		"@app.cell",
		"def _(mo, cond):",
		'    mo.stop(cond, mo.md("bloqueado"))',
		'    mo.md("continua")',
		"    return",
	].join("\n");

	assert.equal(
		cellsWithMultipleTopLevelMoCalls(src).length,
		0,
		"mo.stop() is an early-exit gate, not a display call",
	);
});

// ── runtime key contract ──────────────────────────────────────────────────────

test("no notebook references an undefined lab_runtime_context() key", () => {
	const runtimePath = join(
		ROOT,
		"99 - Meta e Anexos",
		"Notebooks",
		"_lab_notebook_runtime.py",
	);
	if (!existsSync(runtimePath)) return;

	const runtimeSrc = readFileSync(runtimePath, "utf8");
	// Extract keys from the `return { ... }` block inside lab_runtime_context().
	// The block spans multiple lines so we match up to the closing brace.
	const returnMatch = runtimeSrc.match(/return \{([\s\S]*?)\}/m);
	if (!returnMatch) return;
	const validKeys = new Set(
		[...returnMatch[1].matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]),
	);

	const notebooks = discoverNotebooks(ROOT);
	const violations = [];
	for (const relPath of notebooks) {
		const absPath = join(ROOT, relPath);
		if (!existsSync(absPath)) continue;
		const src = readFileSync(absPath, "utf8");
		// Match _ctx["key"], context["key"], _context["key"]
		for (const [, key] of src.matchAll(
			/(?:_ctx|context|_context)\["([^"]+)"\]/g,
		)) {
			if (!validKeys.has(key)) {
				violations.push(
					`${relPath.split("/").pop()}: chave "${key}" não existe em lab_runtime_context()`,
				);
			}
		}
	}
	assert.equal(
		violations.length,
		0,
		`Notebooks referenciam chaves indefinidas do runtime:\n${violations.join("\n")}`,
	);
});

// ── contract tests against actual notebooks ───────────────────────────────────

const NOTEBOOKS = discoverNotebooks(ROOT);

for (const relPath of NOTEBOOKS) {
	const name = relPath.split("/").pop();
	test(`notebook cell output contract: ${name}`, (t) => {
		const absPath = join(ROOT, relPath);
		if (!existsSync(absPath)) {
			t.skip(`${name} not present in this vault`);
			return;
		}
		const source = readFileSync(absPath, "utf8");
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

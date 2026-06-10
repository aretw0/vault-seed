const LAB_RUNTIME_IMPORT_PREFIX = "_lab_notebook_runtime";
const LAB_RUNTIME_HELPER_EXPORT_NAMES = [
	"is_pyodide_runtime",
	"lab_runtime_context",
	"require_local_runtime",
	"normalize_dataset_path",
	"dataset_candidate_paths",
	"read_lab_json",
	"load_lab_manifest",
	"get_lab_dataset",
	"read_lab_dataset",
	"local_vault_path",
	"write_local_json_snapshot",
	"write_local_dataframe_snapshot",
	"get_local_secret",
	"clean_lab_text",
	"fingerprint_data",
	"read_local_text_file",
	"read_local_bytes_file",
	"fetch_local_url_text",
	"scrape_local_page_text",
	"extract_local_image_text",
];

function collectRuntimeImports(sourceCode, runtimeImportPrefix) {
	const importPrefix = `from ${runtimeImportPrefix} import`;
	const lines = sourceCode.split(/\r?\n/);
	const statements = [];
	const removeIndexes = new Set();

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const trimmed = line.trimStart();
		if (!trimmed.startsWith(importPrefix)) {
			continue;
		}

		let statement = trimmed;
		removeIndexes.add(index);

		if (trimmed.includes("(") && !trimmed.includes(")")) {
			while (index + 1 < lines.length) {
				index += 1;
				removeIndexes.add(index);
				statement += `\n${lines[index].trim()}`;
				if (lines[index].includes(")")) {
					break;
				}
			}
		}

		statements.push(statement);
	}

	return { lines, removeIndexes, statements };
}

function parseRuntimeImportNames(importStatements, runtimeImportPrefix) {
	const importNameRegex = new RegExp(
		`^\\s*from\\s+${runtimeImportPrefix}\\s+import\\s+([\\s\\S]*)$`,
	);
	const parsedImportNames = [];
	for (const statement of importStatements) {
		const match = statement.match(importNameRegex);
		if (!match) {
			continue;
		}

		const names = match[1].replace(/[()]/g, "").replace(/\n/g, ",").split(",");
		for (const rawName of names) {
			const name = rawName.replace(/\s+as\s+\w+$/i, "").trim();
			if (!name || parsedImportNames.includes(name)) {
				continue;
			}
			parsedImportNames.push(name);
		}
	}

	return parsedImportNames;
}

/**
 * Strips the compatibility shim wrapper (`try: from dgk_lab_runtime import *`)
 * and returns only the inline fallback function definitions.
 *
 * Marimo's AST parser converts cells with wildcard imports (`import *`) to
 * `app._unparsable_cell(...)`, which is never executed in the WASM runtime.
 * The fallback content starts at the line after `except ImportError:` and is
 * indented 4 spaces — we dedent it to the top level so it can be placed
 * directly inside `def _():`.
 */
function extractFallbackSource(source) {
	const lines = source.split(/\r?\n/);
	const exceptIdx = lines.findIndex((l) =>
		l.trimStart().startsWith("except ImportError:"),
	);
	if (exceptIdx === -1) return source;
	return lines
		.slice(exceptIdx + 1)
		.map((line) => (line.startsWith("    ") ? line.slice(4) : line))
		.join("\n");
}

function buildRuntimeHelperCell(runtimeHelperSource, helperExportNames) {
	const injectionSource = extractFallbackSource(runtimeHelperSource);
	return `@app.cell
def _():
${injectionSource
		.split(/\r?\n/)
		.map((line) => `    ${line}`)
		.join("\n")}

    return ${helperExportNames.join(", ")}
`;
}

export function replaceImportAndInjectRuntimeHelpers(
	sourceCode,
	{
		runtimeHelperSource,
		runtimeImportPrefix = LAB_RUNTIME_IMPORT_PREFIX,
		supportedHelperNames = LAB_RUNTIME_HELPER_EXPORT_NAMES,
	} = {},
) {
	if (!runtimeHelperSource) {
		throw new Error("runtimeHelperSource is required");
	}

	const runtimeImports = collectRuntimeImports(sourceCode, runtimeImportPrefix);
	if (!runtimeImports.statements.length) {
		return sourceCode;
	}

	const parsedImportNames = parseRuntimeImportNames(
		runtimeImports.statements,
		runtimeImportPrefix,
	);
	if (!parsedImportNames.length) {
		return sourceCode;
	}

	const helperExportNames = parsedImportNames.filter((name) =>
		supportedHelperNames.includes(name),
	);
	if (!helperExportNames.length) {
		return sourceCode;
	}

	const cleanedLines = runtimeImports.lines.filter(
		(_line, index) => !runtimeImports.removeIndexes.has(index),
	);

	const helperLines = buildRuntimeHelperCell(runtimeHelperSource, helperExportNames)
		.replace(/^\n/, "")
		.split(/\r?\n/);

	const APP_INIT_PATTERN = /^\s*app\s*=\s*(?:\w+\.)?App\s*\(/;
	const appAssignmentIndex = cleanedLines.findIndex((line) =>
		APP_INIT_PATTERN.test(line),
	);

	const lines =
		appAssignmentIndex >= 0
			? [
					...cleanedLines.slice(0, appAssignmentIndex + 1),
					...helperLines,
					...cleanedLines.slice(appAssignmentIndex + 1),
				]
			: [...helperLines, ...cleanedLines];

	let cellIndex = -1;

	return lines
		.map((line, index, arr) => {
			const match = line.match(/^def\s+(\w+)\((.*)\):$/);
			if (!match) {
				if (line.trimStart() === "@app.cell") {
					const next = arr[index + 1] ?? "";
					if (/^def\s+/.test(next)) {
						cellIndex += 1;
					}
				}
				return line;
			}

			if (cellIndex <= 0) {
				return line;
			}

			const existing = match[2]
				? match[2]
						.split(",")
						.map((name) => name.trim())
						.filter(Boolean)
				: [];
			const merged = [...existing];
			for (const name of helperExportNames) {
				if (!merged.includes(name)) {
					merged.push(name);
				}
			}

			return `def ${match[1]}(${merged.join(", ")}):`;
		})
		.join("\n");
}

export { LAB_RUNTIME_HELPER_EXPORT_NAMES, LAB_RUNTIME_IMPORT_PREFIX };

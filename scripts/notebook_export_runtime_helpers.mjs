const LAB_RUNTIME_IMPORT_PREFIX = "_lab_notebook_runtime";
const LAB_RUNTIME_HELPER_EXPORT_NAMES = [
	"normalize_dataset_path",
	"dataset_candidate_paths",
	"read_lab_json",
	"load_lab_manifest",
];

function parseRuntimeImportNames(sourceCode, runtimeImportPrefix) {
	const importPrefix = `from ${runtimeImportPrefix} import`;
	const runtimeImportLines = sourceCode
		.split(/\r?\n/)
		.filter((line) => line.trimStart().startsWith(importPrefix));

	const importNameRegex = new RegExp(
		`^\\s*from\\s+${runtimeImportPrefix}\\s+import\\s+(.*)$`,
	);
	const parsedImportNames = [];
	for (const line of runtimeImportLines) {
		const match = line.match(importNameRegex);
		if (!match) {
			continue;
		}

		const names = match[1].split(",");
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

function buildRuntimeHelperCell(runtimeHelperSource, helperExportNames) {
	return `@app.cell

def _lab_notebook_runtime_helpers():
    import json
    import os

${runtimeHelperSource
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

	const importPrefix = `from ${runtimeImportPrefix} import`;
	const parsedImportNames = parseRuntimeImportNames(
		sourceCode,
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

	const cleanedLines = sourceCode
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith(importPrefix));

	const helperLines = buildRuntimeHelperCell(
		runtimeHelperSource,
		helperExportNames,
	)
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

const fs = require("fs");
const path = require("path");

const root = process.cwd();

const requiredPaths = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "99 - Meta & Attachments/Guia do Jardineiro Digital.md",
  "99 - Meta & Attachments/Seus Primeiros Passos.md",
  "99 - Meta & Attachments/Exploracao Guiada do Vault.md",
  "99 - Meta & Attachments/Preparando seu Computador para o Vault.md",
  "99 - Meta & Attachments/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta & Attachments/Configurando o Obsidian Git.md",
  "40 - Resources/O que sao system prompts de IA.md",
];

const templateOnlyRequiredPaths = [
  "AGENTS.template.md",
  "README.template.md",
  "CONTRIBUTING.template.md",
  "docs/INDEX.md",
  "docs/estrategia-plugins-obsidian.md",
];

const wikiLinkEntryPoints = [
  "README.md",
  "99 - Meta & Attachments/Guia do Jardineiro Digital.md",
  "99 - Meta & Attachments/Exploracao Guiada do Vault.md",
  "99 - Meta & Attachments/Preparando seu Computador para o Vault.md",
  "99 - Meta & Attachments/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta & Attachments/Configurando o Obsidian Git.md",
  "99 - Meta & Attachments/Seus Primeiros Passos.md",
  "99 - Meta & Attachments/Entendendo a Estrutura de Pastas.md",
  "40 - Resources/Filosofia e Conceitos Fundamentais.md",
  "40 - Resources/O que sao system prompts de IA.md",
];

const templateOnlyWikiLinkEntryPoints = [
  "README.template.md",
  "CONTRIBUTING.template.md",
];

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".trash",
  ".obsidian/plugins",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = toPosix(path.relative(root, fullPath));

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(relative)) {
        walk(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relative);
    }
  }

  return files;
}

function noteKey(relativePath) {
  return path.basename(relativePath, ".md").toLowerCase();
}

function parseWikiTarget(rawTarget) {
  const withoutAlias = rawTarget.split("|")[0].trim();
  const withoutHeading = withoutAlias.split("#")[0].trim();

  if (!withoutHeading || withoutHeading.startsWith("http")) {
    return null;
  }

  return withoutHeading.replace(/\\/g, "/");
}

function validateRequiredPaths(errors) {
  const templateMode = exists("README.template.md") || exists("AGENTS.template.md");
  const pathsToCheck = templateMode
    ? requiredPaths.concat(templateOnlyRequiredPaths)
    : requiredPaths;

  for (const requiredPath of pathsToCheck) {
    if (!exists(requiredPath)) {
      errors.push(`Missing required onboarding file: ${requiredPath}`);
    }
  }
}

function validateWikiLinks(allFiles, filesToValidate, errors) {
  const byBasename = new Map();
  const byRelative = new Set(allFiles.map((file) => file.toLowerCase()));

  for (const file of allFiles) {
    const key = noteKey(file);
    if (!byBasename.has(key)) {
      byBasename.set(key, []);
    }
    byBasename.get(key).push(file);
  }

  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;

  for (const file of filesToValidate) {
    if (!exists(file)) {
      continue;
    }

    const content = fs.readFileSync(path.join(root, file), "utf8");
    let match;

    while ((match = wikiLinkPattern.exec(content)) !== null) {
      const target = parseWikiTarget(match[1]);
      if (!target) {
        continue;
      }

      const targetWithExtension = target.endsWith(".md")
        ? target
        : `${target}.md`;
      const resolvedFromFile = toPosix(
        path.normalize(path.join(path.dirname(file), targetWithExtension)),
      ).toLowerCase();
      const directRelative = targetWithExtension.toLowerCase();
      const basename = path.basename(target, ".md").toLowerCase();

      const found =
        byRelative.has(resolvedFromFile) ||
        byRelative.has(directRelative) ||
        byBasename.has(basename);

      if (!found) {
        errors.push(`${file}: unresolved wikilink [[${match[1]}]]`);
      }
    }
  }
}

function main() {
  const errors = [];
  const allFiles = walk(root);

  validateRequiredPaths(errors);
  const templateMode = exists("README.template.md") || exists("AGENTS.template.md");
  const entryPoints = templateMode
    ? wikiLinkEntryPoints.concat(templateOnlyWikiLinkEntryPoints)
    : wikiLinkEntryPoints;

  validateWikiLinks(allFiles, entryPoints, errors);

  if (errors.length > 0) {
    console.error("Onboarding validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Onboarding validation passed: ${entryPoints.length} entrypoint files checked.`,
  );
}

main();

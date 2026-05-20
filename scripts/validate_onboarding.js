const fs = require("fs");
const path = require("path");

const requiredPaths = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "99 - Meta e Anexos/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/Seus Primeiros Passos.md",
  "99 - Meta e Anexos/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta e Anexos/Configurando o Obsidian Git.md",
  "99 - Meta e Anexos/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/MOC Vault Seed.md",
  "99 - Meta e Anexos/Vault Seed Kitchen Sink.base",
  "40 - Recursos/O que sao system prompts de IA.md",
  "40 - Recursos/Bases.md",
  "40 - Recursos/Dataview.md",
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
  "99 - Meta e Anexos/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta e Anexos/Configurando o Obsidian Git.md",
  "99 - Meta e Anexos/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/MOC Vault Seed.md",
  "99 - Meta e Anexos/Seus Primeiros Passos.md",
  "99 - Meta e Anexos/Entendendo a Estrutura de Pastas.md",
  "99 - Meta e Anexos/Evoluindo seu Vault com Links, Tags e MOCs.md",
  "99 - Meta e Anexos/Criando seu Painel de Controle (Dashboard).md",
  "40 - Recursos/Filosofia e Conceitos Fundamentais.md",
  "40 - Recursos/O que sao system prompts de IA.md",
  "40 - Recursos/Bases.md",
  "40 - Recursos/Dataview.md",
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

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(root, dir = root, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = toPosix(path.relative(root, fullPath));

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(relative)) {
        walk(root, fullPath, files);
      }
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".base"))
    ) {
      files.push(relative);
    }
  }

  return files;
}

function noteKey(relativePath) {
  const extension = path.extname(relativePath);
  return path
    .basename(
      relativePath,
      extension === ".md" || extension === ".base" ? extension : "",
    )
    .toLowerCase();
}

function hasSupportedExtension(target) {
  return target.endsWith(".md") || target.endsWith(".base");
}

function parseWikiTarget(rawTarget) {
  const withoutAlias = rawTarget.split("|")[0].trim();
  const withoutHeading = withoutAlias.split("#")[0].trim();

  if (!withoutHeading || withoutHeading.startsWith("http")) {
    return null;
  }

  return withoutHeading.replace(/\\/g, "/");
}

function validateRequiredPaths(root, errors) {
  const templateMode =
    exists(root, "README.template.md") || exists(root, "AGENTS.template.md");
  const pathsToCheck = templateMode
    ? requiredPaths.concat(templateOnlyRequiredPaths)
    : requiredPaths;

  for (const requiredPath of pathsToCheck) {
    if (!exists(root, requiredPath)) {
      errors.push(`Missing required onboarding file: ${requiredPath}`);
    }
  }
}

function validateWikiLinks(root, allFiles, filesToValidate, errors) {
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
    if (!exists(root, file)) {
      continue;
    }

    const content = fs.readFileSync(path.join(root, file), "utf8");
    let match;

    while ((match = wikiLinkPattern.exec(content)) !== null) {
      const target = parseWikiTarget(match[1]);
      if (!target) {
        continue;
      }

      const targetWithExtension = hasSupportedExtension(target)
        ? target
        : `${target}.md`;
      const resolvedFromFile = toPosix(
        path.normalize(path.join(path.dirname(file), targetWithExtension)),
      ).toLowerCase();
      const directRelative = targetWithExtension.toLowerCase();
      const targetExtension = path.extname(target);
      const basename = path
        .basename(target, hasSupportedExtension(target) ? targetExtension : "")
        .toLowerCase();

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

function validateOnboarding(root = process.cwd()) {
  const errors = [];
  const allFiles = walk(root);

  validateRequiredPaths(root, errors);
  const templateMode =
    exists(root, "README.template.md") || exists(root, "AGENTS.template.md");
  const entryPoints = templateMode
    ? wikiLinkEntryPoints.concat(templateOnlyWikiLinkEntryPoints)
    : wikiLinkEntryPoints;

  validateWikiLinks(root, allFiles, entryPoints, errors);

  return {
    errors,
    entryPointCount: entryPoints.length,
  };
}

function main() {
  const result = validateOnboarding();

  if (result.errors.length > 0) {
    console.error("Onboarding validation failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Onboarding validation passed: ${result.entryPointCount} entrypoint files checked.`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  parseWikiTarget,
  validateOnboarding,
};

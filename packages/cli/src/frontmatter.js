/**
 * Serialização de frontmatter YAML compatível com Obsidian.
 * Só usa aspas quando realmente necessário — sem ruído no histórico Git.
 *
 * Padrão portado de um motor de frontmatter validado numa instância downstream privada.
 */

export function yamlScalar(value) {
  if (value === null || value === undefined || value === '') return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    const needsQuotes =
      /^\s|\s$/.test(value) ||
      /[:\[\]{},&*!|>'"%@`?]/.test(value) ||
      /^-/.test(value) ||
      /\n/.test(value) ||
      value === 'null' ||
      value === 'true' ||
      value === 'false' ||
      /^\d+$/.test(value) ||
      /^-?\d+(\.\d+)?$/.test(value);
    if (needsQuotes) {
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return value;
  }
  return JSON.stringify(value);
}

export function toYaml(value, indent = 0) {
  const prefix = ' '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map((item) => `${prefix}- ${yamlScalar(item)}`).join('\n');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return '{}';
    return entries.map(([key, item]) => {
      if (Array.isArray(item)) {
        if (item.length === 0) return `${prefix}${key}: []`;
        return `${prefix}${key}:\n${toYaml(item, indent + 2)}`;
      }
      if (item && typeof item === 'object') {
        return `${prefix}${key}:\n${toYaml(item, indent + 2)}`;
      }
      return `${prefix}${key}: ${yamlScalar(item)}`;
    }).join('\n');
  }

  return `${prefix}${yamlScalar(value)}`;
}

/** Envolve um objeto de frontmatter nos delimitadores --- do Obsidian. */
export function renderFrontmatter(frontmatter) {
  return `---\n${toYaml(frontmatter)}\n---`;
}

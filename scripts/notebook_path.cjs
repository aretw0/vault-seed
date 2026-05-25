function resolveNotebooksPath(value = process.env.VAULT_NOTEBOOKS_PATH || "lab") {
  const normalized = String(value || "lab").trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new Error(
      `VAULT_NOTEBOOKS_PATH inválido: ${value}. Use um único segmento de URL, como "lab", "notebooks" ou "studio".`,
    );
  }

  return normalized;
}

module.exports = { resolveNotebooksPath };

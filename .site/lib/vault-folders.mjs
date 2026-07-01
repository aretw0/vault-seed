import { vaultFolders } from './vault-config.mjs';

// The folder list now comes from the manifest ($ref to .site/vault-folders.json) — one logical source.
export const VAULT_FOLDERS = Object.freeze([...vaultFolders.all]);

// Folders excluded from the public site (e.g. templates) come from vault.config.json, not a hardcoded name.
const _excludeFromPublic = new Set(vaultFolders.excludeFromPublic);
export const PUBLISHED_VAULT_FOLDERS = Object.freeze(
  VAULT_FOLDERS.filter((folder) => !_excludeFromPublic.has(folder)),
);

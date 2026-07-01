import config from '../vault-folders.json' with { type: 'json' };
import { vaultFolders } from './vault-config.mjs';

export const VAULT_FOLDERS = Object.freeze([...config.folders]);

// Folders excluded from the public site (e.g. templates) come from vault.config.json, not a hardcoded name.
const _excludeFromPublic = new Set(vaultFolders.excludeFromPublic);
export const PUBLISHED_VAULT_FOLDERS = Object.freeze(
  VAULT_FOLDERS.filter((folder) => !_excludeFromPublic.has(folder)),
);

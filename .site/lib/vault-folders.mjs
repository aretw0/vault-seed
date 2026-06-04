import config from '../vault-folders.json' with { type: 'json' };

export const VAULT_FOLDERS = Object.freeze([...config.folders]);

export const PUBLISHED_VAULT_FOLDERS = Object.freeze(
  VAULT_FOLDERS.filter((folder) => folder !== '90 - Modelos'),
);

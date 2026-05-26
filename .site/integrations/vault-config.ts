// .site/integrations/vault-config.ts
// Shared configuration constants for vault integrations.
// Re-export from the runtime module so Astro integrations and Node scripts use
// the same folder contract.

export { VAULT_FOLDERS, PUBLISHED_VAULT_FOLDERS } from '../lib/vault-folders.mjs';

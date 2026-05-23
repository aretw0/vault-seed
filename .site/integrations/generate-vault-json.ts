// .site/integrations/generate-vault-json.ts
import type { AstroIntegration } from 'astro';
import { writeVaultData } from '../../scripts/generate_vault_data.mjs';

export interface VaultNote {
  id: string;
  title: string;
  folder: string;
  status: string | null;
  tags: string[];
  links: string[];
  created: string | null;
  updated: string | null;
}

export function generateVaultJson(): AstroIntegration {
  return {
    name: 'generate-vault-json',
    hooks: {
      'astro:build:start': ({ logger }) => {
        try {
          const { data } = writeVaultData();
          logger.info(`vault-data.json: ${data.noteCount} notas escritas`);
        } catch (err) {
          logger.error(err instanceof Error ? err.message : String(err));
          throw err;
        }
      },
    },
  };
}

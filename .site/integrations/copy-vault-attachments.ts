// .site/integrations/copy-vault-attachments.ts
//
// Copies all files from the vault's attachment folder into Astro's
// public/assets/ directory so that ![[image.png]] wikilink embeds resolve.
//
// Works for both `astro dev` and `astro build`:
//   - Dev:   Vite's buildStart hook runs on server start → files are served
//             immediately; restart dev server after adding new attachments.
//   - Build: Files land in public/assets/ before Astro copies public/ → dist/.
//
// Vault attachment folder:   <project-root>/99 - Meta e Anexos/Anexos/
// Astro public/assets/:      <project-root>/public/assets/
//
// The attachment folder is configured in .obsidian/app.json:
//   "attachmentFolderPath": "99 - Meta e Anexos/Anexos"

import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';

const ATTACHMENT_FOLDER = '99 - Meta e Anexos/Anexos';
const PUBLIC_ASSETS = 'public/assets';

export function copyVaultAttachments(): AstroIntegration {
  return {
    name: 'copy-vault-attachments',
    hooks: {
      'astro:config:done': ({ logger }) => {
        const src  = join(process.cwd(), ATTACHMENT_FOLDER);
        const dest = join(process.cwd(), PUBLIC_ASSETS);

        if (!existsSync(src)) {
          logger.warn(`copy-vault-attachments: attachment folder not found: ${ATTACHMENT_FOLDER}`);
          return;
        }

        mkdirSync(dest, { recursive: true });

        cpSync(src, dest, {
          recursive: true,
          // Skip .gitkeep and hidden files; copy everything else.
          filter: (source) => {
            const name = source.split(/[\\/]/).pop() ?? '';
            return name !== '.gitkeep' && !name.startsWith('.');
          },
        });

        logger.info(`copy-vault-attachments: synced ${ATTACHMENT_FOLDER} → ${PUBLIC_ASSETS}`);
      },
    },
  };
}

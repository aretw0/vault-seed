// .site/integrations/copy-vault-attachments.ts
//
// Copies attachment files referenced by published vault notes into Astro's
// public/assets/ directory so that ![[image.png]] wikilink embeds resolve.
//
// Approach (ported from astro-vault/src/integrations/sync-assets.js):
//   1. Scan all vault Markdown files for ![[filename]] and (filename.ext) refs.
//   2. Copy only referenced files from the attachment folder → public/assets/.
//   3. Skip files prefixed with _ (private convention).
//   4. Skip if file unchanged (mtime check).
//
// Works for both `astro dev` and `astro build`:
//   - astro:config:done  — initial sync at startup
//   - astro:server:setup — watches attachment folder during dev
//   - astro:build:setup  — re-sync before production build
//
// Vault attachment folder:  <root>/99 - Meta e Anexos/Anexos/
// Astro public/assets/:     <root>/public/assets/
// Configured in .obsidian/app.json: "attachmentFolderPath": "99 - Meta e Anexos/Anexos"

import { globSync } from 'glob';
import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { AstroIntegration } from 'astro';

const ATTACHMENT_FOLDER = '99 - Meta e Anexos/Anexos';
const PUBLIC_ASSETS     = 'public/assets';
const IMAGE_EXTENSIONS  = '{png,jpg,jpeg,gif,svg,webp}';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

/** Returns the set of image filenames referenced in any vault note. */
function collectReferencedImages(root: string): Set<string> {
  const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
  const files = globSync(patterns, { cwd: root });

  // Matches ![[filename.ext]] and standard ![](filename.ext) or (filename.ext)
  const re = /(?:!\[\[(.*?)(?:\|.*?)?\]\])|(?:\(([^)]*\.(?:png|jpg|jpeg|gif|svg|webp))\))/gi;
  const refs = new Set<string>();

  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf-8');
    let match: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((match = re.exec(content)) !== null) {
      const name = match[1] ?? match[2];
      if (name) refs.add(basename(name));
    }
  }

  return refs;
}

function sync(root: string, logger: { info: (m: string) => void; warn: (m: string) => void }) {
  const src  = join(root, ATTACHMENT_FOLDER);
  const dest = join(root, PUBLIC_ASSETS);

  if (!existsSync(src)) {
    logger.warn(`copy-vault-attachments: attachment folder not found: ${ATTACHMENT_FOLDER}`);
    return;
  }

  mkdirSync(dest, { recursive: true });

  const referenced = collectReferencedImages(root);
  logger.info(`copy-vault-attachments: ${referenced.size} referenced image(s) found`);

  const available = globSync(`**/*.${IMAGE_EXTENSIONS}`, { cwd: src });
  let copied = 0;

  for (const file of available) {
    const name = basename(file);

    // Skip private files (prefixed with _)
    if (name.startsWith('_')) continue;

    // Skip unreferenced files
    if (!referenced.has(name)) continue;

    const srcPath  = join(src, file);
    const destPath = join(dest, name);

    // Skip if destination is up-to-date
    if (existsSync(destPath) && statSync(srcPath).mtimeMs <= statSync(destPath).mtimeMs) continue;

    copyFileSync(srcPath, destPath);
    logger.info(`copy-vault-attachments: synced ${name}`);
    copied++;
  }

  if (copied === 0) {
    logger.info('copy-vault-attachments: all assets up-to-date');
  }
}

export function copyVaultAttachments(): AstroIntegration {
  return {
    name: 'copy-vault-attachments',
    hooks: {
      'astro:config:done': ({ logger }) => {
        sync(process.cwd(), logger);
      },
      'astro:server:setup': ({ server, logger }) => {
        // Re-sync when a new file lands in the attachment folder during dev.
        server.watcher.add(join(process.cwd(), ATTACHMENT_FOLDER));
        server.watcher.on('add', (filePath: string) => {
          if (filePath.includes(ATTACHMENT_FOLDER)) {
            sync(process.cwd(), logger);
          }
        });
      },
      'astro:build:setup': ({ logger }) => {
        sync(process.cwd(), logger);
      },
    },
  };
}

/**
 * Build-time vault configuration reader.
 *
 * Reads vault.config.json from the repo root and resolves package versions
 * from node_modules. All values are computed once at module load (SSG build).
 *
 * License granularity:
 *   - vault.config.json:  site-wide default (type + holder)
 *   - Note frontmatter:   per-note override (license + author fields)
 *   The Footer component combines these; per-note values take precedence.
 *
 * CC license type strings are normalised to their canonical deed URL.
 * Unknown strings are passed through as plain text with no badge URL.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// vault.config.json
// ---------------------------------------------------------------------------
function readVaultConfig() {
  const p = join(ROOT, 'vault.config.json');
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
}

const _cfg = readVaultConfig();

export const vaultLicense = {
  type:      _cfg.license?.type      ?? null,
  holder:    _cfg.license?.holder    ?? null,
  // Optional URL the footer links the holder/author to (e.g. the owner's GitHub).
  // initialize.yml sets this to the new repo owner's profile for generated vaults.
  holderUrl: _cfg.license?.holderUrl ?? null,
};

// Optional personal sign-off shown below the license row.
// Set to null in vault.config.json to disable (default for user vaults after init).
export const vaultKudos = typeof _cfg.kudos === 'string' && _cfg.kudos.trim() ? _cfg.kudos.trim() : null;

// ---------------------------------------------------------------------------
// Package versions — read at build time; gracefully absent before first install
// ---------------------------------------------------------------------------
function pkgVersion(relPath) {
  const p = join(ROOT, relPath);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')).version ?? null; } catch { return null; }
}

export const versions = {
  astro:    pkgVersion('node_modules/astro/package.json'),
  starlight: pkgVersion('node_modules/@astrojs/starlight/package.json'),
  dgkCli:   pkgVersion('node_modules/@aretw0/dgk-cli/package.json'),
  vault:    pkgVersion('package.json'),
};

// ---------------------------------------------------------------------------
// CC license → canonical deed URL
// Accepts common shorthand ("CC BY", "CC BY 4.0", "CC0") and returns
// { label, url } or null for unknown/non-CC strings.
// ---------------------------------------------------------------------------
const CC_MAP = {
  'CC0':            { label: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC0 1.0':        { label: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC BY':          { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'CC BY 4.0':      { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  'CC BY-SA':       { label: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'CC BY-SA 4.0':   { label: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'CC BY-NC':       { label: 'CC BY-NC 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  'CC BY-NC 4.0':   { label: 'CC BY-NC 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  'CC BY-NC-SA':    { label: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  'CC BY-NC-SA 4.0':{ label: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  'CC BY-ND':       { label: 'CC BY-ND 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/' },
  'CC BY-ND 4.0':   { label: 'CC BY-ND 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/' },
  'CC BY-NC-ND':    { label: 'CC BY-NC-ND 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
  'CC BY-NC-ND 4.0':{ label: 'CC BY-NC-ND 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
};

export function resolveLicense(typeStr) {
  if (!typeStr) return null;
  const key = typeStr.trim().toUpperCase().replace(/\s+/g, ' ');
  return CC_MAP[key] ?? { label: typeStr, url: null };
}

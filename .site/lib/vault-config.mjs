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
import { fileURLToPath } from 'node:url';

// Repo root resolved relative to this module (this file lives at .site/lib/), not process.cwd(), so the
// manifest + its $ref targets resolve identically no matter where a build or script is invoked from.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ---------------------------------------------------------------------------
// vault.config.json
// ---------------------------------------------------------------------------
// `$ref` resolution: a section may be `{ "$ref": "relative/path.json" }`, resolved to that file's
// contents (relative to the repo root). This keeps the manifest one logical document while bulky
// sections (vocab, folder lists) live in focused, editable files. See the manifest design.
function resolveRefs(value) {
  if (Array.isArray(value)) return value.map(resolveRefs);
  if (value && typeof value === 'object') {
    if (typeof value.$ref === 'string') {
      try { return JSON.parse(readFileSync(join(ROOT, value.$ref), 'utf8')); } catch { return {}; }
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveRefs(v);
    return out;
  }
  return value;
}

function readVaultConfig() {
  const p = join(ROOT, 'vault.config.json');
  if (!existsSync(p)) return {};
  try { return resolveRefs(JSON.parse(readFileSync(p, 'utf8'))); } catch { return {}; }
}

const _cfg = readVaultConfig();

// Controlled vocabulary (categories/audiences/intents), referenced from a focused file via `$ref`.
export const vaultVocab = _cfg.vocab ?? {};

// Note-status lifecycle (canonical, subvertible): the states the vault recognizes and which one is
// public. Surfaces gate visibility on `vaultStatus.publicState` — never a hardcoded 'published'.
export const vaultStatus = {
  states: Array.isArray(_cfg.status?.states) ? _cfg.status.states : ['draft', 'published'],
  publicState: _cfg.status?.publicState ?? 'published',
};

// Folder roles (canonical, subvertible): which PARA folders are excluded from the public site (e.g. the
// templates folder). Surfaces derive PUBLISHED_VAULT_FOLDERS from this — never a hardcoded folder name.
export const vaultFolders = {
  excludeFromPublic: Array.isArray(_cfg.folders?.excludeFromPublic) ? _cfg.folders.excludeFromPublic : [],
  // The PARA folder list — referenced from .site/vault-folders.json via `$ref` ({ folders: [...] }).
  all: Array.isArray(_cfg.folders?.list?.folders) ? _cfg.folders.list.folders : [],
};

// Credentials product policy (canonical, subvertible): the headspace passes this object directly to
// credentials:v1 verify(input, policy). Secrets, keys, signatures, and revocation mechanics stay in refarm.
export const vaultCredentials = {
  verificationPolicy: _cfg.credentials?.verificationPolicy ?? {
    trustSelf: true,
    trustedIssuers: [],
    revocation: 'required',
    validity: 'required',
  },
};

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

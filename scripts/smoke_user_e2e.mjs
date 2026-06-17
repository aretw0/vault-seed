/**
 * End-to-end smoke for the user vault experience.
 *
 * Simulates initialization (same logic as smoke_user_vault.mjs) then runs
 * three layers of validation against the resulting vault:
 *
 *   Layer 1 — Onboarding contract (no deps)
 *     Calls validateOnboarding() with the user vault as root.
 *     Proves required files exist and wiki-links resolve.
 *
 *   Layer 2 — Admin server startup
 *     Starts createAdminServer(tmpDir) on port 0, exercises key endpoints,
 *     then shuts down. Proves the CLI can serve a fresh vault.
 *     Endpoints probed: GET /api/status, /api/services, /api/outbox, /api/inbox
 *
 *   Layer 3 — Full installation + test suite (--full flag)
 *     Runs `pnpm install --frozen-lockfile` in the temp vault (using the
 *     pnpm-lock.yaml from pnpm-lock.template.yaml), then runs the user's
 *     `node --test scripts/*.test.js scripts/*.test.mjs scripts/*.test.cjs`.
 *     Slow (~30s). Skip in normal CI; run locally before release.
 *
 * Run: node scripts/smoke_user_e2e.mjs
 * Run: node scripts/smoke_user_e2e.mjs --full
 */
import {
  mkdtempSync, mkdirSync, copyFileSync, rmSync,
  existsSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FULL = process.argv.includes('--full');

// ---------------------------------------------------------------------------
// Init helpers (mirrors smoke_user_vault.mjs — parse initialize.yml once)
// ---------------------------------------------------------------------------
function parseInitializeYml() {
  const content = readFileSync(join(ROOT, '.github/workflows/initialize.yml'), 'utf8');
  const parseTokens = (str) =>
    str.replace(/\\ /g, '\x00').split(/\s+/).filter(Boolean).map((s) => s.replace(/\x00/g, ' '));
  const removeMatch = content.match(/files_to_remove:\s*"([^"]+)"/);
  const renameMatch = content.match(/files_to_rename:\s*"([^"]+)"/);
  const workflowMatch = content.match(/workflow_filename:\s*"([^"]+)"/);
  return {
    filesToRemove: removeMatch ? parseTokens(removeMatch[1]) : [],
    filesToRename: renameMatch
      ? parseTokens(renameMatch[1]).map((p) => { const c = p.indexOf(':'); return { src: p.slice(0, c), dst: p.slice(c + 1) }; })
      : [],
    workflowFilename: workflowMatch ? workflowMatch[1] : '.github/workflows/initialize.yml',
  };
}

function safeCopy(src, dst) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}

// (RESET_ON_INIT removed — initialize.yml does not reset any notes to draft.
// Onboarding notes in 99.1 are already status: draft in source.
// All other published notes ship as-is to the user vault.)

// ---------------------------------------------------------------------------
// Build simulated user vault in a temp directory
// ---------------------------------------------------------------------------
function buildUserVault() {
  const { filesToRemove, filesToRename, workflowFilename } = parseInitializeYml();

  const trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean);

  const tmpDir = mkdtempSync(join(tmpdir(), 'vault-seed-e2e-'));

  for (const file of trackedFiles) safeCopy(join(ROOT, file), join(tmpDir, file));

  for (const { src, dst } of filesToRename) {
    const srcPath = join(tmpDir, src);
    const dstPath = join(tmpDir, dst);
    if (existsSync(srcPath)) { safeCopy(srcPath, dstPath); rmSync(srcPath); }
  }

  for (const entry of filesToRemove) {
    const fullPath = join(tmpDir, entry);
    if (existsSync(fullPath)) rmSync(fullPath, { recursive: true, force: true });
  }

  const selfPath = join(tmpDir, workflowFilename);
  if (existsSync(selfPath)) rmSync(selfPath);

  // Step 2 — Publish user welcome note and clear vault-seed kudos (mirrors initialize.yml).
  const welcomePath = join(tmpDir, '00 - Entrada/Bem-vindo ao seu vault.md');
  if (existsSync(welcomePath)) {
    const updated = readFileSync(welcomePath, 'utf8').replace(/^status: draft$/m, 'status: published');
    writeFileSync(welcomePath, updated, 'utf8');
  }
  const vaultConfigPath = join(tmpDir, 'vault.config.json');
  if (existsSync(vaultConfigPath)) {
    const cfg = JSON.parse(readFileSync(vaultConfigPath, 'utf8'));
    delete cfg.kudos;
    writeFileSync(vaultConfigPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  }

  return tmpDir;
}

// ---------------------------------------------------------------------------
// Layer 1 — Onboarding contract (uses validate_onboarding.js as a module)
// ---------------------------------------------------------------------------
function runOnboardingLayer(tmpDir, errors) {
  console.log('  Layer 1: onboarding contract...');
  // validate_onboarding.js uses process.cwd() when called without argument.
  // It exports validateOnboarding(root) so we can pass the temp dir directly.
  const requireFromRoot = createRequire(join(ROOT, 'package.json'));
  const { validateOnboarding } = requireFromRoot('./scripts/validate_onboarding.js');
  const result = validateOnboarding(tmpDir);
  for (const e of result.errors) errors.push(`[L1] ${e}`);
  if (result.errors.length === 0) {
    console.log(`    OK — ${result.entryPointCount} entrypoint files validated.`);
  }
}

// ---------------------------------------------------------------------------
// Layer 2 — Admin server startup
// ---------------------------------------------------------------------------
async function runServerLayer(tmpDir, errors) {
  console.log('  Layer 2: admin server startup...');

  // Import from the monorepo source; in the user vault this would be from
  // node_modules, but the server logic is identical.
  const { createAdminServer } = await import('../packages/cli/src/commands/serve.js');

  // Use a no-op silo path so we don't read ~/.dgk during tests.
  const siloPath = join(tmpDir, '.dgk-test-silo.json');

  const server = createAdminServer(tmpDir, siloPath);

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });

  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const probes = [
    { path: '/api/status',   expectKey: 'channels' },
    { path: '/api/services', expectKey: 'services' },
    { path: '/api/outbox',   expectKey: 'items' },
    { path: '/api/inbox',    expectKey: 'items' },
  ];

  for (const probe of probes) {
    try {
      const res = await fetch(`${base}${probe.path}`);
      if (!res.ok) {
        errors.push(`[L2] ${probe.path} returned HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!(probe.expectKey in data)) {
        errors.push(`[L2] ${probe.path}: missing key '${probe.expectKey}' in response`);
      } else {
        console.log(`    OK — ${probe.path}`);
      }
    } catch (err) {
      errors.push(`[L2] ${probe.path}: ${err.message}`);
    }
  }

  await new Promise((resolve) => server.close(resolve));
}

// ---------------------------------------------------------------------------
// Layer 3 — Full install + user test suite (--full only)
// ---------------------------------------------------------------------------
function checkNpmPackages(pkg) {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const external = Object.keys(allDeps).filter((name) => name.startsWith('@aretw0/'));
  const unpublished = [];
  for (const name of external) {
    try {
      execFileSync('npm', ['view', name, 'version'], { stdio: 'pipe', shell: true, encoding: 'utf8' });
    } catch {
      unpublished.push(name);
    }
  }
  return unpublished;
}

function runFullInstallLayer(tmpDir, errors) {
  console.log('  Layer 3: pnpm install + user test suite...');

  // The lock file was renamed from pnpm-lock.template.yaml → pnpm-lock.yaml by
  // initialize.yml. Verify it exists so we can run --frozen-lockfile.
  const lockFile = join(tmpDir, 'pnpm-lock.yaml');
  if (!existsSync(lockFile)) {
    errors.push('[L3] pnpm-lock.yaml missing from user vault — cannot run --frozen-lockfile');
    return;
  }

  // Pre-check: all @aretw0/* packages must be published before install can succeed.
  let pkg;
  try { pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')); } catch { pkg = {}; }
  const unpublished = checkNpmPackages(pkg);
  if (unpublished.length > 0) {
    for (const name of unpublished) {
      errors.push(`[L3] ${name} is not published to npm — user vault is not installable until this package is released`);
    }
    return;
  }

  try {
    execFileSync('pnpm', ['install', '--frozen-lockfile'], {
      cwd: tmpDir,
      stdio: 'inherit',
      shell: false,
    });
    console.log('    OK — pnpm install succeeded.');
  } catch {
    errors.push('[L3] pnpm install --frozen-lockfile failed');
    return;
  }

  // Run the user's own test suite (scripts/*.test.{js,mjs,cjs}).
  // This is the glob from package.template.json.
  try {
    execFileSync(
      'node',
      ['--test', 'scripts/*.test.js', 'scripts/*.test.mjs', 'scripts/*.test.cjs'],
      { cwd: tmpDir, stdio: 'inherit', shell: true },
    );
    console.log('    OK — user test suite passed.');
  } catch {
    errors.push('[L3] user test suite failed after install');
  }

  // Layer 3b: site build.
  // packages/dgk-astro-plugins is NOT removed by initialize.yml, so astro build
  // must work in the user vault after install. Verifies the full publish pipeline.
  console.log('  Layer 3b: site build (astro build)...');
  try {
    execFileSync('pnpm', ['run', 'site:build'], {
      cwd: tmpDir,
      stdio: 'inherit',
      shell: false,
    });
  } catch {
    errors.push('[L3b] pnpm run site:build failed in user vault');
    return;
  }

  const distDir = join(tmpDir, 'dist');
  if (!existsSync(distDir)) {
    errors.push('[L3b] astro build did not produce a dist/ directory');
    return;
  }

  const { readdirSync } = await import('node:fs');
  function countHtml(dir) {
    let n = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) n += countHtml(join(dir, entry.name));
      else if (entry.name.endsWith('.html')) n += 1;
    }
    return n;
  }
  const htmlCount = countHtml(distDir);
  // At minimum: index.html + 404.html + rss.xml page wrapper + the one published note (Bem-vindo).
  const MIN_HTML = 3;
  if (htmlCount < MIN_HTML) {
    errors.push(`[L3b] astro build produced only ${htmlCount} HTML files — expected at least ${MIN_HTML}`);
  } else {
    console.log(`    OK — site build produced ${htmlCount} HTML files.`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const errors = [];
let tmpDir = null;

try {
  console.log(`User vault E2E smoke${FULL ? ' (--full)' : ''}...`);
  tmpDir = buildUserVault();
  console.log(`  Vault built at ${tmpDir}`);

  runOnboardingLayer(tmpDir, errors);
  await runServerLayer(tmpDir, errors);

  if (FULL) {
    runFullInstallLayer(tmpDir, errors);
  } else {
    console.log('  Layer 3: skipped (pass --full to run install + test suite).');
  }
} finally {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error(`\nUser vault E2E smoke failed (${errors.length} violation${errors.length > 1 ? 's' : ''}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log('\nUser vault E2E smoke passed.');

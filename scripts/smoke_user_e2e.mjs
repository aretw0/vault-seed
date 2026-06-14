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

function applyStatusReset(content) {
  return content.split(/\r?\n/).map((l) => (l === 'status: published' ? 'status: draft' : l)).join('\n');
}

const RESET_ON_INIT = [
  '30 - Áreas/Blog/Jardim digital - por onde começar.md',
  '40 - Recursos/Mermaid.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando com Devcontainer.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Depois da Recepcao do Template.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Entendendo a Estrutura de Pastas.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Exploracao Guiada do Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md',
  '99 - Meta e Anexos/99.1 - Onboarding/MOC Vault Seed.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md',
  '99 - Meta e Anexos/99.1 - Onboarding/Seus Primeiros Passos.md',
  '99 - Meta e Anexos/99.2 - Workflows/Automacoes no Obsidian.md',
  '99 - Meta e Anexos/99.2 - Workflows/Coletando Dados Locais com Scraping e OCR.md',
  '99 - Meta e Anexos/99.2 - Workflows/Configurando o Obsidian Git.md',
  '99 - Meta e Anexos/99.2 - Workflows/Criando seu Painel de Controle (Dashboard).md',
  '99 - Meta e Anexos/99.2 - Workflows/Inbox Soberana de Fontes.md',
  '99 - Meta e Anexos/99.2 - Workflows/O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais).md',
  '99 - Meta e Anexos/99.2 - Workflows/Outbox Soberana de Publicação.md',
  '99 - Meta e Anexos/99.2 - Workflows/Preparando Dados para o Lab.md',
  '99 - Meta e Anexos/99.2 - Workflows/Publicando e Consumindo RSS no Vault.md',
  '99 - Meta e Anexos/99.2 - Workflows/Publicando seu Vault como Site.md',
  '99 - Meta e Anexos/99.2 - Workflows/Rotina de Curadoria Editorial.md',
  '99 - Meta e Anexos/99.2 - Workflows/Usando o Git e o GitHub para Sincronizar seu Vault.md',
  '99 - Meta e Anexos/99.2 - Workflows/Usando o Lab (Notebooks Marimo).md',
  '99 - Meta e Anexos/99.3 - Referência/Automatizando a Inicialização do Vault.md',
  '99 - Meta e Anexos/99.3 - Referência/Conhecendo o Agents Lab.md',
  '99 - Meta e Anexos/99.3 - Referência/Convenções e Boas Práticas.md',
  '99 - Meta e Anexos/99.3 - Referência/Ecossistema aretw0 Agents Lab e Refarm.md',
  '99 - Meta e Anexos/99.3 - Referência/Evoluindo seu Vault com Links, Tags e MOCs.md',
  '99 - Meta e Anexos/99.3 - Referência/Identidade Visual e Blocos de Interface.md',
  '99 - Meta e Anexos/99.3 - Referência/Integrando com VSCode (Foam).md',
  '99 - Meta e Anexos/99.3 - Referência/Plugins Essenciais e Recomendados.md',
  '99 - Meta e Anexos/99.3 - Referência/Qualidade e Lint de Notas.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando com Agentes de IA.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando o Plugin Templates.md',
  '99 - Meta e Anexos/99.3 - Referência/Usando o Vault no Celular vs. Desktop.md',
  '99 - Meta e Anexos/99.3 - Referência/Visualização do Fluxo do Vault.md',
  '99 - Meta e Anexos/Diagramas/Exemplos.md',
];

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

  for (const notePath of RESET_ON_INIT) {
    const fullPath = join(tmpDir, notePath);
    if (existsSync(fullPath)) writeFileSync(fullPath, applyStatusReset(readFileSync(fullPath, 'utf8')));
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

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { detectObsidian, INSTALL_HINTS } from '../launcher.js';

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 22) {
    console.log(`  Node.js ${process.version} encontrado — versão 22+ necessária.`);
    console.log('  Instale via fnm: https://github.com/Schniz/fnm  →  fnm install 22');
    console.log('  Ou via nvm:      nvm install 22');
    return false;
  }
  console.log(`✓ Node.js ${process.version}`);
  return true;
}

function git(args) {
  try {
    execFileSync('git', args, { stdio: 'pipe' });
  } catch {
    // git config errors are non-fatal (e.g. not in a repo)
  }
}

function configureGit() {
  git(['config', 'commit.template', '.gitmessage']);
  git(['config', 'core.quotepath', 'false']);
  git(['config', 'i18n.commitEncoding', 'UTF-8']);
  git(['config', 'i18n.logOutputEncoding', 'UTF-8']);
  console.log('✓ Git configurado (commit template, quotepath, UTF-8)');
}

function checkDeps(runner) {
  if (!existsSync('node_modules')) {
    console.log('Instalando dependências Node.js...');
    // --frozen-lockfile is for CI; setup is local bootstrap where lockfile may lag new deps
    return runner('pnpm', ['install']);
  }
  console.log('✓ Dependências Node.js já instaladas');
  return Promise.resolve();
}

async function installPythonTools(runner) {
  let uvFound = false;
  try {
    execFileSync('uv', ['--version'], { stdio: 'pipe' });
    uvFound = true;
  } catch {
    console.log('  uv não encontrado — git-filter-repo não instalado.');
    console.log('  Instale uv: https://docs.astral.sh/uv/getting-started/installation/');
    return;
  }

  if (!uvFound) return;

  // Check PATH first — may have been installed via pipx or manually
  try {
    execFileSync('git-filter-repo', ['--version'], { stdio: 'pipe' });
    console.log('✓ git-filter-repo já disponível no PATH');
    return;
  } catch { /* not in PATH — install */ }

  try {
    await runner('uv', ['tool', 'install', 'git-filter-repo']);
    console.log('✓ git-filter-repo instalado via uv');
  } catch {
    console.log('  Aviso: não foi possível instalar git-filter-repo. Instale manualmente: uv tool install git-filter-repo');
  }
}

export async function setup(args, runner) {
  // Inline runner to avoid circular dep — setup bootstraps before run() is usable
  const _runner = runner ?? (async (cmd, a) => {
    const { run } = await import('../runner.js');
    return run(cmd, a);
  });

  checkNodeVersion();
  configureGit();
  await checkDeps(_runner);
  await installPythonTools(_runner);

  const obsidian = detectObsidian();
  if (obsidian) {
    console.log(`✓ Obsidian encontrado em: ${obsidian.path}`);
    console.log('  Para usar dgk lab note: Obsidian → Configurações → Geral → Interface de linha de comando → Registrar CLI');
  } else {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o Obsidian em https://obsidian.md';
    console.log(`  Obsidian não encontrado. ${hint}`);
    console.log('  Isso é opcional — o vault funciona sem Obsidian instalado.');
  }

  console.log('\nSetup completo. Use `dgk check` para verificar a saúde do vault.');
}

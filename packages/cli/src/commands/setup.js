import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLaunchProcessSpecFromRunner, runLaunchProcessSync } from '@refarm.dev/launch-process';
import { detectObsidian, INSTALL_HINTS } from '../launcher.js';

const CHECK_SUBSTRATE = fileURLToPath(new URL('../../vendor/check-substrate.mjs', import.meta.url));

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

function git(args, runSync = runLaunchProcessSync) {
  // git config errors are non-fatal (e.g. not in a repo)
  runSync(createLaunchProcessSpecFromRunner('git', args), { capture: true });
}

/** True if `cmd --version` is reachable. runLaunchProcessSync swallows ENOENT into exitCode. */
export function hasTool(cmd, runSync = runLaunchProcessSync) {
  const { exitCode } = runSync(
    createLaunchProcessSpecFromRunner(cmd, ['--version']),
    { capture: true },
  );
  return exitCode === 0;
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
  if (!hasTool('uv')) {
    console.log('  uv não encontrado — git-filter-repo não instalado.');
    console.log('  Instale uv: https://docs.astral.sh/uv/getting-started/installation/');
    return;
  }
  // Check PATH first — may have been installed via pipx or manually
  if (hasTool('git-filter-repo')) {
    console.log('✓ git-filter-repo já disponível no PATH');
    return;
  }
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

  console.log('\nVerificando o ambiente...');
  try {
    await _runner('node', [CHECK_SUBSTRATE]);
    console.log('\nSetup completo. Use `dgk check` para verificar a saúde do vault.');
  } catch {
    console.log('\nSetup com pendências — rode `dgk doctor` para ver o que falta corrigir.');
  }
}

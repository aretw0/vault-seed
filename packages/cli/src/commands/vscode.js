import {
  createProcessHandoffSpecFromRunner,
  runProcessHandoffSync,
  startDetachedProcessHandoff,
} from '@refarm.dev/process-handoff';

export const INSTALL_HINTS = {
  darwin:
    'Instale o VS Code em https://code.visualstudio.com ou via: brew install --cask visual-studio-code',
  win32:
    'Instale o VS Code em https://code.visualstudio.com ou via: winget install Microsoft.VisualStudioCode',
  linux:
    'Instale o VS Code em https://code.visualstudio.com ou via snap: sudo snap install code --classic',
};

/** Returns true if the `code` CLI is reachable. runSync injectable for tests. */
export function detectVSCode(runSync = runProcessHandoffSync) {
  const { exitCode } = runSync(
    createProcessHandoffSpecFromRunner('code', ['--version']),
    { capture: true },
  );
  return exitCode === 0;
}

/** Opens the current directory in VS Code. launchFn injectable for tests. */
export function openVSCode(cwd = process.cwd(), launchFn = startDetachedProcessHandoff) {
  launchFn(createProcessHandoffSpecFromRunner('code', ['.'], { cwd }));
  return Promise.resolve();
}

export async function vscode(args, _runner, launcher) {
  const { detectVSCode: detect, openVSCode: open } = launcher ?? {
    detectVSCode,
    openVSCode,
  };

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`dgk vscode

Abre o vault no VS Code com Foam pré-configurado.
As configurações em .vscode/settings.json e .vscode/extensions.json
são aplicadas automaticamente ao abrir.

Exemplos:
  dgk vscode`);
    return;
  }

  if (!detect()) {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o VS Code em https://code.visualstudio.com';
    console.error(`dgk vscode: VS Code (code CLI) não encontrado.\n${hint}`);
    process.exit(1);
  }

  await open();
  console.log('Abrindo vault no VS Code...');
}

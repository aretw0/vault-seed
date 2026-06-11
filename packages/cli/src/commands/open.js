import { run } from '../runner.js';
import {
  detectObsidian as _detectObsidian,
  launchVault as _launchVault,
  vaultNameFromCwd,
  INSTALL_HINTS,
} from '../launcher.js';
import { listNotebooks, resolveNotebook } from './lab.js';

function printHelp(root) {
  const notebooks = listNotebooks(root);
  const notebookList = notebooks.length
    ? notebooks.map((n) => `  ${n.name}`).join('\n')
    : '  (nenhum notebook encontrado)';

  console.log(`dgk open <alvo> [opções]

Abre o vault no Obsidian ou um notebook no marimo.

Alvos:
  obsidian [nome]      Abre o vault no Obsidian via URI scheme
  <notebook>           Abre o notebook no marimo

Notebooks disponíveis:
${notebookList}

Exemplos:
  dgk open obsidian
  dgk open publicar-thread
  dgk open analise-feeds`);
}

async function openObsidian(args, launcher) {
  const { detectObsidian, launchVault } = launcher ?? {
    detectObsidian: _detectObsidian,
    launchVault: _launchVault,
  };
  const vaultName = args[0] || vaultNameFromCwd();
  const found = detectObsidian();
  if (!found) {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o Obsidian em https://obsidian.md';
    console.error(`dgk open obsidian: Obsidian não encontrado.\n${hint}`);
    process.exit(1);
  }
  await launchVault(vaultName);
  console.log(`Abrindo vault '${vaultName}' no Obsidian...`);
}

async function openNotebook(name, runner, root) {
  const path = resolveNotebook(name, root);
  if (!path) {
    const available = listNotebooks(root).map((n) => `  ${n.name}`).join('\n');
    console.error(`dgk open: notebook '${name}' não encontrado.\nDisponíveis:\n${available}`);
    process.exit(1);
  }
  await runner('uv', ['run', 'marimo', 'edit', path]);
}

export async function open(args, runner = run, launcher, root) {
  const [target, ...rest] = args;

  if (!target || target === '--help' || target === '-h') {
    printHelp(root);
    return;
  }

  if (target === 'obsidian') {
    await openObsidian(rest, launcher);
    return;
  }

  await openNotebook(target, runner, root);
}

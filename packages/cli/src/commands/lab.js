import { readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { run } from '../utils.js';
import { findObsidianCli, OBSIDIAN_SETUP_HINT } from '../obsidian.js';
import {
  detectObsidian as _detectObsidian,
  launchVault as _launchVault,
  vaultNameFromCwd,
  INSTALL_HINTS,
} from '../launcher.js';

const NOTEBOOKS_DIR = '99 - Meta e Anexos/Notebooks';
const PRIVATE_FILES = new Set(['_lab_notebook_runtime.py']);

/** Returns { name, path } for each notebook in NOTEBOOKS_DIR. */
export function listNotebooks(root = process.cwd()) {
  const dir = join(root, NOTEBOOKS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.py') && !PRIVATE_FILES.has(f))
    .map((f) => ({ name: basename(f, '.py'), path: join(NOTEBOOKS_DIR, f) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

/** Resolves a short name or partial path to a notebook path. Returns null if not found. */
export function resolveNotebook(nameOrPath, root = process.cwd()) {
  if (nameOrPath.endsWith('.py') && existsSync(join(root, nameOrPath))) {
    return nameOrPath;
  }
  const notebooks = listNotebooks(root);
  const exact = notebooks.find((n) => n.name === nameOrPath);
  if (exact) return exact.path;
  const partial = notebooks.filter((n) => n.name.includes(nameOrPath));
  return partial.length === 1 ? partial[0].path : null;
}

function printHelp() {
  console.log(`dgk lab <subcomando> [opções]

Subcomandos:
  etl                  Executa o pipeline ETL (node direto, sem dependência de pnpm)
  open [notebook]      Abre um notebook no marimo (liste nomes com dgk lab list)
  export               Exporta notebooks para HTML empacotado
  curate               Classifica feeds com Claude API (requer ANTHROPIC_API_KEY)
  list                 Lista notebooks disponíveis
  open-vault [nome]    Abre o vault no Obsidian via URI scheme
  note <cmd> ...       Passa um comando para o Obsidian CLI (requer Obsidian 1.12+)

Exemplos:
  dgk lab etl
  dgk lab open analise-feeds
  dgk lab open-vault
  dgk lab note search query="jardim digital"
  dgk lab note create name="Nova nota" content="# Rascunho"`);
}

async function etl(_args, runner) {
  await runner('node', ['scripts/lab_etl_demo.mjs']);
  await runner('node', ['scripts/prepare_feed_sources.mjs']);
  await runner('node', ['scripts/prepare_publication_outbox.mjs']);
  await runner('node', ['scripts/prepare_lab_datasets.mjs']);
}

async function openNotebook(args, runner, root) {
  const [name] = args;
  if (!name) {
    console.error('dgk lab open: informe o nome do notebook. Use dgk lab list para ver opções.');
    process.exit(1);
  }
  const path = resolveNotebook(name, root);
  if (!path) {
    const available = listNotebooks(root).map((n) => `  ${n.name}`).join('\n');
    console.error(`dgk lab open: notebook '${name}' não encontrado.\nDisponíveis:\n${available}`);
    process.exit(1);
  }
  await runner('uv', ['run', 'marimo', 'edit', path]);
}

async function exportNotebooks(_args, runner) {
  await runner('node', ['scripts/export_notebooks.mjs']);
}

async function curate(_args, runner) {
  await runner('uv', [
    'run',
    '--with', 'anthropic',
    '--with', 'defusedxml',
    'python',
    'scripts/curate_feeds_ia.py',
  ]);
}

async function list(_args, _runner, root) {
  const notebooks = listNotebooks(root);
  if (!notebooks.length) {
    console.log('Nenhum notebook encontrado em', NOTEBOOKS_DIR);
    return;
  }
  console.log(`Notebooks disponíveis em ${NOTEBOOKS_DIR}:\n`);
  for (const { name, path } of notebooks) {
    console.log(`  ${name.padEnd(30)} ${path}`);
  }
}

async function openVault(args, _runner, launcher) {
  const { detectObsidian, launchVault } = launcher ?? {
    detectObsidian: _detectObsidian,
    launchVault: _launchVault,
  };
  const vaultName = args[0] || vaultNameFromCwd();
  const found = detectObsidian();
  if (!found) {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o Obsidian em https://obsidian.md';
    console.error(`dgk lab open-vault: Obsidian não encontrado.\n${hint}`);
    process.exit(1);
  }
  await launchVault(vaultName);
  console.log(`Abrindo vault '${vaultName}' no Obsidian...`);
}

async function note(args, runner, obsidianFinder) {
  const finder = obsidianFinder ?? findObsidianCli;
  if (!args.length) {
    console.error('dgk lab note: informe um comando do Obsidian CLI (ex: search, read, create).');
    console.error(`\n${OBSIDIAN_SETUP_HINT}`);
    process.exit(1);
  }
  const cmd = await finder();
  if (!cmd) {
    console.error('dgk lab note: Obsidian CLI não encontrado ou Obsidian não está em execução.');
    console.error(`\n${OBSIDIAN_SETUP_HINT}`);
    process.exit(1);
  }
  await runner(cmd, args);
}

const SUBCOMMANDS = {
  etl,
  open: openNotebook,
  export: exportNotebooks,
  curate,
  list,
  'open-vault': openVault,
  note,
};

export async function lab(args, runner = run, obsidianFinder, launcher, root) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (!(subcommand in SUBCOMMANDS)) {
    console.error(`dgk lab: subcomando desconhecido '${subcommand}'`);
    printHelp();
    process.exit(1);
  }

  if (subcommand === 'note') {
    await note(rest, runner, obsidianFinder);
  } else if (subcommand === 'open-vault') {
    await openVault(rest, runner, launcher);
  } else if (subcommand === 'open') {
    await openNotebook(rest, runner, root);
  } else if (subcommand === 'list') {
    await list(rest, runner, root);
  } else {
    await SUBCOMMANDS[subcommand](rest, runner);
  }
}

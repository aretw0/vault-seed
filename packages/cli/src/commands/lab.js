import { readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { run } from '../runner.js';
import { injectSiloEnv } from '../silo.js';

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

function printHelp(root) {
  const notebooks = listNotebooks(root);
  const notebookList = notebooks.length
    ? notebooks.map((n) => `  ${n.name}`).join('\n')
    : '  (nenhum notebook encontrado)';

  console.log(`dgk lab [notebook | subcomando] [opções]

O laboratório: notebooks de exploração e análise do vault.

Notebooks disponíveis:
${notebookList}

Subcomandos:
  export           Exporta notebooks para HTML empacotado
  curate           Classifica feeds com IA (requer chave de LLM via dgk sow)
  evaluate [nota]  Avalia qualidade de escrita (determinístico, sem API)

Para pipeline de dados e publicação, use os comandos top-level:
  dgk etl                   → processa dados do vault
  dgk outbox telegram       → publica notas da fila
  dgk inbox telegram        → importa mensagens para 00 - Entrada/

Exemplos:
  dgk lab analise-feeds
  dgk lab evaluate
  dgk lab evaluate "40 - Recursos/Jardim digital.md"
  dgk lab evaluate --profile ultra-rigor`);
}

async function openNotebook(name, runner, root) {
  const path = resolveNotebook(name, root);
  if (!path) {
    const available = listNotebooks(root).map((n) => `  ${n.name}`).join('\n');
    console.error(`dgk lab: notebook '${name}' não encontrado.\nDisponíveis:\n${available}`);
    process.exit(1);
  }
  await runner('uv', ['run', '--with', 'marimo', 'marimo', 'edit', path]);
}

async function evaluate(args, runner) {
  const noteArg = args.find((a) => !a.startsWith('--'));
  const profileIdx = args.indexOf('--profile');
  const profile = profileIdx !== -1 ? args[profileIdx + 1] : null;
  const pyArgs = ['scripts/avaliar_textos.py'];
  if (noteArg) pyArgs.push('--note', noteArg);
  if (profile) pyArgs.push('--profile', profile);
  await runner('uv', ['run', 'python', ...pyArgs]);
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

const PIPELINE_COMMANDS = {
  export: exportNotebooks,
  curate,
  evaluate,
};

export async function lab(args, runner = run, root) {
  injectSiloEnv();
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp(root);
    return;
  }

  if (subcommand in PIPELINE_COMMANDS) {
    await PIPELINE_COMMANDS[subcommand](rest, runner);
    return;
  }

  // Anything else is treated as a notebook name
  await openNotebook(subcommand, runner, root);
}

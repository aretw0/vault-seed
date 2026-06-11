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

function printHelp() {
  console.log(`dgk lab <subcomando> [opções]

Subcomandos:
  etl              Executa o pipeline ETL completo (dados, feeds, outbox, datasets)
  export           Exporta notebooks para HTML empacotado
  curate           Classifica feeds com IA (requer ANTHROPIC_API_KEY via dgk sow ou env)
  evaluate [nota]  Avalia qualidade de escrita das notas (determinístico, sem API)

Para abrir notebooks ou o Obsidian, use dgk open.

Fluxo típico:
  dgk sow mastodon          → configura credenciais (uma vez)
  dgk lab etl               → processa dados do vault
  dgk open publicar-thread  → abre notebook de publicação
  dgk open obsidian         → abre o vault no Obsidian

Exemplos:
  dgk lab etl
  dgk lab evaluate
  dgk lab evaluate "40 - Recursos/Jardim digital.md"
  dgk lab evaluate --profile ultra-rigor
  dgk lab export
  dgk lab curate`);
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

async function etl(_args, runner) {
  await runner('node', ['scripts/lab_etl_demo.mjs']);
  await runner('node', ['scripts/prepare_feed_sources.mjs']);
  await runner('node', ['scripts/prepare_publication_outbox.mjs']);
  await runner('node', ['scripts/prepare_lab_datasets.mjs']);
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

const SUBCOMMANDS = { etl, export: exportNotebooks, curate, evaluate };

export async function lab(args, runner = run) {
  injectSiloEnv();
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

  await SUBCOMMANDS[subcommand](rest, runner);
}

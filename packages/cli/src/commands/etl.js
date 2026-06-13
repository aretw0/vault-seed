import { run } from '../runner.js';
import { injectSiloEnv } from '../silo.js';

function printHelp() {
  console.log(`dgk etl

Executa o pipeline de dados do vault em sequência:
  1. lab_etl_demo.mjs              indexa notas e gera dados gerais
  2. prepare_feed_sources.mjs      processa fontes de feed externas
  3. prepare_publication_outbox.mjs popula a fila de publicação
  4. prepare_lab_datasets.mjs      prepara datasets para notebooks

Uso:
  dgk etl

Fluxo típico:
  dgk sow telegram    → configura credenciais (uma vez)
  dgk etl             → processa dados do vault
  dgk outbox telegram → publica notas da fila`);
}

export async function etl(args, runner = run) {
  injectSiloEnv();
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }
  await runner('node', ['scripts/lab_etl_demo.mjs']);
  await runner('node', ['scripts/prepare_feed_sources.mjs']);
  await runner('node', ['scripts/prepare_publication_outbox.mjs']);
  await runner('node', ['scripts/prepare_lab_datasets.mjs']);
}

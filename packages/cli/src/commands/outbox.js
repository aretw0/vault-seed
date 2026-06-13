import { run } from '../runner.js';
import { injectSiloEnv } from '../silo.js';

const CHANNELS = {
  telegram: async (args, runner) => {
    await runner('node', ['scripts/publish_to_telegram.mjs', ...args]);
  },
};

function printHelp() {
  console.log(`dgk outbox <canal> [opções]

Publica notas da fila de publicação para o canal especificado.
Execute \`dgk etl\` antes para atualizar a fila com notas recentes.

Canais disponíveis:
  telegram   Publica via bot do Telegram

Opções:
  --dry-run  Mostra o que seria publicado sem enviar

Exemplos:
  dgk outbox telegram
  dgk outbox telegram --dry-run`);
}

export async function outbox(args, runner = run) {
  injectSiloEnv();
  const [channel, ...rest] = args;

  if (!channel || channel === '--help' || channel === '-h') {
    printHelp();
    return;
  }

  if (!(channel in CHANNELS)) {
    console.error(`dgk outbox: canal desconhecido '${channel}'. Disponíveis: ${Object.keys(CHANNELS).join(', ')}`);
    process.exit(1);
  }

  await CHANNELS[channel](rest, runner);
}

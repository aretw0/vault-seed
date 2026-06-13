import { run } from '../runner.js';
import { injectSiloEnv } from '../silo.js';

const CHANNELS = {
  telegram: async (args, runner) => {
    await runner('node', ['scripts/inbox_from_telegram.mjs', ...args]);
  },
};

function printHelp() {
  console.log(`dgk inbox <canal> [opções]

Importa mensagens de um canal para 00 - Entrada/ do vault.

Canais disponíveis:
  telegram   Importa mensagens do bot do Telegram

Opções:
  --limit N  Limita o número de mensagens importadas (padrão: sem limite)

Exemplos:
  dgk inbox telegram
  dgk inbox telegram --limit 10`);
}

export async function inbox(args, runner = run) {
  injectSiloEnv();
  const [channel, ...rest] = args;

  if (!channel || channel === '--help' || channel === '-h') {
    printHelp();
    return;
  }

  if (!(channel in CHANNELS)) {
    console.error(`dgk inbox: canal desconhecido '${channel}'. Disponíveis: ${Object.keys(CHANNELS).join(', ')}`);
    process.exit(1);
  }

  await CHANNELS[channel](rest, runner);
}

import { run } from '../runner.js';
import { injectSiloEnv, SERVICES } from '../silo.js';

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
  --force    Republica notas já enviadas (ignora histórico de envio)
  --limit N  Máximo de notas por execução (padrão: 5)

Exemplos:
  dgk outbox telegram
  dgk outbox telegram --dry-run
  dgk outbox telegram --force --dry-run   # prévia de reenvio
  dgk outbox telegram --force             # republica tudo`);
}

export async function outbox(args, runner = run) {
  injectSiloEnv();
  const [channel, ...rest] = args;

  if (!channel || channel === '--help' || channel === '-h') {
    printHelp();
    return;
  }

  if (!(channel in CHANNELS)) {
    if (channel in SERVICES) {
      console.error(`dgk outbox: publicação para '${channel}' ainda não implementada.`);
      console.error(`  Canais com publicação disponível: ${Object.keys(CHANNELS).join(', ')}`);
      console.error(`  As credenciais de '${channel}' foram salvas e podem ser usadas quando o suporte for adicionado.`);
    } else {
      console.error(`dgk outbox: canal desconhecido '${channel}'. Disponíveis: ${Object.keys(CHANNELS).join(', ')}`);
    }
    process.exit(1);
  }

  await CHANNELS[channel](rest, runner);
}

import { run } from '../runner.js';
import { findObsidianCli, OBSIDIAN_SETUP_HINT } from '../obsidian.js';

export async function note(args, runner = run, obsidianFinder) {
  const finder = obsidianFinder ?? findObsidianCli;
  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    console.log(`dgk note <cmd> [args...]

Passa um comando para o Obsidian CLI (requer Obsidian 1.12+ com CLI registrado).

${OBSIDIAN_SETUP_HINT}

Exemplos:
  dgk note search query="jardim digital"
  dgk note read path="40 - Recursos/Jardim digital.md"
  dgk note create path="10 - Diário/2026-06-11.md"`);
    return;
  }

  const cmd = await finder();
  if (!cmd) {
    console.error('dgk note: Obsidian CLI não encontrado ou Obsidian não está em execução.');
    console.error(`\n${OBSIDIAN_SETUP_HINT}`);
    process.exit(1);
  }
  await runner(cmd, args);
}

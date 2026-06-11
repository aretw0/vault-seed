import { run } from '../runner.js';
import {
  detectObsidian as _detectObsidian,
  launchVault as _launchVault,
  vaultNameFromCwd,
  INSTALL_HINTS,
} from '../launcher.js';

export async function obsidian(args, runner = run, launcher) {
  const { detectObsidian, launchVault } = launcher ?? {
    detectObsidian: _detectObsidian,
    launchVault: _launchVault,
  };

  if (args[0] === '--help' || args[0] === '-h') {
    console.log(`dgk obsidian [nome-do-vault]

Abre o vault no Obsidian via URI scheme.
Se o nome não for passado, usa o nome do diretório atual.

Exemplos:
  dgk obsidian
  dgk obsidian meu-vault`);
    return;
  }

  const vaultName = args[0] || vaultNameFromCwd();
  const found = detectObsidian();
  if (!found) {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o Obsidian em https://obsidian.md';
    console.error(`dgk obsidian: Obsidian não encontrado.\n${hint}`);
    process.exit(1);
  }
  await launchVault(vaultName);
  console.log(`Abrindo vault '${vaultName}' no Obsidian...`);
}

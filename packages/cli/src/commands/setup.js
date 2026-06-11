import { run } from '../runner.js';
import { detectObsidian, INSTALL_HINTS } from '../launcher.js';

export async function setup(_args, runner = run) {
  await runner('bash', ['scripts/setup.sh']);

  const obsidian = detectObsidian();
  if (obsidian) {
    console.log(`\n✓ Obsidian encontrado em: ${obsidian.path}`);
    console.log('  Para usar dgk lab note, complete o registro do CLI:');
    console.log(
      '  Obsidian → Configurações → Geral → Interface de linha de comando → Registrar CLI',
    );
  } else {
    const hint = INSTALL_HINTS[process.platform] ?? 'Instale o Obsidian em https://obsidian.md';
    console.log(`\n  Obsidian não encontrado. ${hint}`);
    console.log('  Isso é opcional — o vault funciona sem Obsidian instalado.');
  }
}

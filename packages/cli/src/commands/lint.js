import { run } from '../runner.js';

const MARKDOWNLINT = 'node_modules/markdownlint-cli/markdownlint.js';

export async function lint(_args, runner = run) {
  await runner('node', [
    MARKDOWNLINT,
    '--config', '.markdownlint.json',
    '10 - Diário/**/*.md',
    '20 - Projetos/**/*.md',
    '30 - Áreas/**/*.md',
    '40 - Recursos/**/*.md',
    '50 - Arquivo/**/*.md',
    '99 - Meta e Anexos/**/*.md',
  ]);
  await runner('node', [
    MARKDOWNLINT,
    '--config', 'docs/.markdownlint.json',
    'docs/**/*.md',
  ]);
  await runner('node', [
    MARKDOWNLINT,
    '--config', '90 - Modelos/.markdownlint.json',
    '90 - Modelos/**/*.md',
  ]);
}

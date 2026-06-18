import { fileURLToPath } from 'node:url';
import { run } from '../runner.js';

// Vendorizado em @aretw0/dgk-cli — sobrevive mesmo que o usuário apague
// scripts/ do próprio vault. Roda sempre a partir do cwd (raiz do vault).
const CHECK_SUBSTRATE = fileURLToPath(new URL('../../vendor/check-substrate.mjs', import.meta.url));

export async function doctor(args, runner = run) {
  const isJson = args.includes('--json');
  await runner('node', [CHECK_SUBSTRATE, ...(isJson ? ['--json'] : [])]);
}

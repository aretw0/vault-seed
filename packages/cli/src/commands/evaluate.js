import { fileURLToPath } from 'node:url';
import { run } from '../runner.js';

// Vendorizado em @aretw0/dgk-cli — sobrevive mesmo que o usuário apague
// scripts/ do próprio vault. Roda sempre a partir do cwd (raiz do vault).
const AVALIAR_TEXTOS = fileURLToPath(new URL('../../vendor/quality/avaliar_textos.py', import.meta.url));

export async function evaluate(args, runner = run) {
  const noteArg = args.find((a) => !a.startsWith('--'));
  const profileIdx = args.indexOf('--profile');
  const profile = profileIdx !== -1 ? args[profileIdx + 1] : null;
  const pyArgs = [AVALIAR_TEXTOS];
  if (noteArg) pyArgs.push('--note', noteArg);
  if (profile) pyArgs.push('--profile', profile);
  await runner('uv', ['run', 'python', ...pyArgs]);
}

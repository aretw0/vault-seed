import { run } from '../runner.js';

export async function evaluate(args, runner = run) {
  const noteArg = args.find((a) => !a.startsWith('--'));
  const profileIdx = args.indexOf('--profile');
  const profile = profileIdx !== -1 ? args[profileIdx + 1] : null;
  const pyArgs = ['scripts/avaliar_textos.py'];
  if (noteArg) pyArgs.push('--note', noteArg);
  if (profile) pyArgs.push('--profile', profile);
  await runner('uv', ['run', 'python', ...pyArgs]);
}

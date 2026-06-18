import { run } from '../runner.js';

export async function doctor(args, runner = run) {
  const isJson = args.includes('--json');
  await runner('node', ['scripts/check-substrate.mjs', ...(isJson ? ['--json'] : [])]);
}

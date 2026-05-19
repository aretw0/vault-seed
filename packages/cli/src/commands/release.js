import { run } from '../utils.js';
export async function release(_args, runner = run) {
  await runner('pnpm', ['run', 'release']);
}

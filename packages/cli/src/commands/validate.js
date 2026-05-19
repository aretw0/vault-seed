import { run } from '../utils.js';
export async function validate(_args, runner = run) {
  await runner('pnpm', ['run', 'validate']);
}

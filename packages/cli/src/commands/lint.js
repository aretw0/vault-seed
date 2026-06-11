import { run } from '../runner.js';
export async function lint(_args, runner = run) {
  await runner('pnpm', ['run', 'lint']);
}

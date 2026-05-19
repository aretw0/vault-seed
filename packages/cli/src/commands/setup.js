import { run } from '../utils.js';
export async function setup(_args, runner = run) {
  await runner('bash', ['scripts/setup.sh']);
}

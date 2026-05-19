import { run } from '../utils.js';
export async function check(_args, runner = run) {
  await runner('node', ['scripts/validate_onboarding.js']);
}

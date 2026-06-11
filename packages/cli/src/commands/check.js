import { run } from '../runner.js';
export async function check(_args, runner = run) {
  await runner('node', ['scripts/validate_onboarding.js']);
}

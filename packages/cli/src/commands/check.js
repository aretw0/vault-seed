import { run } from '../runner.js';

export async function check(args, runner = run) {
  const isJson = args.includes('--json');
  const jsonFlag = isJson ? ['--json'] : [];

  await runner('node', ['scripts/validate_onboarding.js']);
  await runner('node', ['scripts/audit_information_architecture.mjs', ...jsonFlag]);
  await runner('node', ['scripts/check_pt_text.js', ...jsonFlag]);
}

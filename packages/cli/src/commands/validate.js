import { run } from '../runner.js';

// Dev-only: full CI validation pipeline (tests, lint, site checks, graph smoke).
// End users should use `dgk check` for day-to-day vault health checks.
export async function validate(_args, runner = run) {
  await runner('pnpm', ['run', 'validate']);
}

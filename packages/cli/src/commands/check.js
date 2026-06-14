import { run } from '../runner.js';
import { siloStatus } from '../silo.js';

function printSiloStatus() {
  const status = siloStatus();
  const configured = status.filter((s) => s.keys.every((k) => k.configured));
  const unconfigured = status.filter((s) => s.keys.some((k) => !k.configured));

  console.log('\nCanais de publicação:');
  for (const svc of configured) {
    console.log(`  ✓ ${svc.label}`);
  }
  for (const svc of unconfigured) {
    console.log(`  ○ ${svc.label}  (configurar com: dgk sow ${svc.id})`);
  }
  if (configured.length === 0) {
    console.log('  Nenhum canal configurado. Use `dgk sow <canal>` para começar.');
  }
}

export async function check(args, runner = run) {
  const isJson = args.includes('--json');
  const jsonFlag = isJson ? ['--json'] : [];

  try {
    await runner('node', ['scripts/validate_onboarding.js']);
    await runner('node', ['scripts/audit_information_architecture.mjs', ...jsonFlag]);
    await runner('node', ['scripts/check_pt_text.js', ...jsonFlag]);
  } catch {
    console.error('\nPróximo passo: consulte 99 - Meta e Anexos/99.1 - Onboarding/');
    console.error('Documentação: https://github.com/aretw0/vault-seed/tree/main/docs');
    process.exit(1);
  }

  if (!isJson) printSiloStatus();
}

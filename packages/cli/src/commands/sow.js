import { createInterface } from 'node:readline';
import { SERVICES, SILO_PATH, saveTokens, removeService, siloStatus } from '../silo.js';

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function verifyMastodon(instance, token) {
  const { request: _req, urlopen: _urlopen } = await import('node:http').catch(() => ({}));
  try {
    const url = `https://${instance}/api/v1/accounts/verify_credentials`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.acct ? `@${data.acct}@${instance}` : null;
  } catch {
    return null;
  }
}

async function verifyBluesky(handle, password) {
  try {
    const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.handle ? `@${data.handle}` : null;
  } catch {
    return null;
  }
}

async function sowService(serviceId) {
  if (!process.stdin.isTTY) {
    console.error('dgk sow: requer terminal interativo');
    process.exit(1);
  }

  const service = SERVICES[serviceId];
  if (!service) {
    console.error(`dgk sow: serviço desconhecido '${serviceId}'`);
    console.error(`Serviços disponíveis: ${Object.keys(SERVICES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\nConfigurar ${service.label}\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const collected = {};

  try {
    for (const p of service.prompts) {
      const answer = await prompt(rl, `${p.label}: `);
      collected[p.key] = answer.trim();
    }
  } finally {
    rl.close();
  }

  if (Object.values(collected).some((v) => !v)) {
    console.error('\nErro: todos os campos são obrigatórios.');
    process.exit(1);
  }

  process.stdout.write('\nVerificando credenciais... ');

  let identity = null;
  if (serviceId === 'mastodon') {
    identity = await verifyMastodon(collected.MASTODON_INSTANCE, collected.MASTODON_TOKEN);
  } else if (serviceId === 'bluesky') {
    identity = await verifyBluesky(collected.BLUESKY_HANDLE, collected.BLUESKY_APP_PASSWORD);
  } else {
    identity = '(não verificado automaticamente)';
  }

  if (identity === null) {
    console.log('falhou.');
    console.error('Credenciais inválidas — token não salvo.');
    process.exit(1);
  }

  console.log(`${identity}`);
  saveTokens(collected);
  console.log(`✓ Salvo em ${SILO_PATH}\n`);
}

function sowList() {
  const status = siloStatus();
  console.log(`\nServiços configurados em ${SILO_PATH}:\n`);
  for (const svc of status) {
    const allConfigured = svc.keys.every((k) => k.configured);
    const marker = allConfigured ? '✓' : '○';
    console.log(`  ${marker} ${svc.label.padEnd(12)}`);
    for (const k of svc.keys) {
      const val = k.configured ? k.preview : '(não configurado)';
      console.log(`      ${k.key.padEnd(26)} ${val}`);
    }
  }
  console.log('');
}

async function sowRemove(serviceId) {
  if (!serviceId) {
    console.error('dgk sow remove: especifique o serviço');
    process.exit(1);
  }
  const removed = removeService(serviceId);
  if (!removed) {
    console.error(`dgk sow remove: serviço desconhecido '${serviceId}'`);
    process.exit(1);
  }
  console.log(`✓ Credenciais de ${serviceId} removidas de ${SILO_PATH}`);
}

export async function sow(args) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === 'list') return sowList();
  if (subcommand === 'remove') return sowRemove(rest[0]);
  return sowService(subcommand);
}

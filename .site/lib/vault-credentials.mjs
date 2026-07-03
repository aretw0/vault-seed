import { vaultCredentials } from './vault-config.mjs';

const defaultImporters = {
  credentials: () => import('@refarm.dev/credentials-contract-v1'),
  identity: () => import('@refarm.dev/identity-heartwood'),
  storage: () => import('@refarm.dev/storage-memory'),
};

const disabledCapabilities = {
  issue: false,
  wallet: false,
  present: false,
  verify: false,
};

const enabledCapabilities = {
  issue: true,
  wallet: true,
  present: true,
  verify: true,
};

function unavailable(policy, error) {
  return {
    available: false,
    reason: 'credentials-stack-unavailable',
    error,
    policy,
    capabilities: disabledCapabilities,
    provider: null,
    identity: null,
    storage: null,
  };
}

function assertStackSurface(credentials, identity, storage) {
  if (typeof credentials?.createReferenceCredentialsProvider !== 'function') {
    throw new Error('credentials:v1 provider factory is unavailable');
  }
  if (typeof identity?.createHeartwoodIdentityProvider !== 'function') {
    throw new Error('identity-heartwood provider factory is unavailable');
  }
  if (typeof storage?.MemoryStorage !== 'function') {
    throw new Error('storage-memory provider is unavailable');
  }
}

export async function loadVaultCredentialsHeadspace(options = {}) {
  const policy = options.policy ?? vaultCredentials.verificationPolicy;
  const importers = options.importers ?? defaultImporters;

  try {
    const [credentials, identityMod, storageMod] = await Promise.all([
      importers.credentials(),
      importers.identity(),
      importers.storage(),
    ]);
    assertStackSurface(credentials, identityMod, storageMod);

    const identity = options.identity ?? identityMod.createHeartwoodIdentityProvider();
    const storage = options.storage ?? new storageMod.MemoryStorage();
    const provider = credentials.createReferenceCredentialsProvider({ identity, storage });

    return {
      available: true,
      reason: null,
      error: null,
      policy,
      capabilities: enabledCapabilities,
      provider,
      identity,
      storage,
    };
  } catch (error) {
    return unavailable(policy, error);
  }
}

export async function verifyWithVaultPolicy(input, options = {}) {
  const headspace = options.headspace ?? await loadVaultCredentialsHeadspace(options);
  if (!headspace.available) {
    return {
      available: false,
      verified: false,
      reason: headspace.reason,
      checks: {},
      policy: headspace.policy,
    };
  }

  const result = await headspace.provider.verify(input, headspace.policy);
  return {
    available: true,
    policy: headspace.policy,
    ...result,
  };
}

import type { APIRoute } from 'astro';
import { buildVaultExploreData } from '../../lib/vault-explore';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildVaultExploreData(), null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });

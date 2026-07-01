import type { APIRoute } from 'astro';
import { buildRecordsManifest, toManifestArtifact } from '../../scripts/generate_records_manifest.mjs';

// The distributable records:v1 manifest — the data artifact of the "notes ARE records" convergence.
// Served as linked data: its records carry the resolvable @context
// (https://refarm.dev/contexts/records/v1, served by refarm). Any ecosystem tool fetches
// /records-manifest.json and reads the same shape. Prerendered into the static site at build.
export const GET: APIRoute = async () => {
  const out = await buildRecordsManifest();
  return new Response(JSON.stringify(toManifestArtifact(out), null, 2), {
    headers: { 'content-type': 'application/ld+json; charset=utf-8' },
  });
};

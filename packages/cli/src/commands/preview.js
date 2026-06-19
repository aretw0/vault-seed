import { run } from '../runner.js';

export function parsePreviewArgs(args) {
  const withLab = args.includes('--lab');
  const withNetwork = args.includes('--network') || args.includes('--host');
  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 && args[portIdx + 1] ? args[portIdx + 1] : '4321';
  return { withLab, withNetwork, port };
}

export async function preview(args, runner = run) {
  const { withLab, withNetwork, port } = parsePreviewArgs(args);

  if (withLab) {
    console.log('[dgk] Exportando notebooks antes do preview...');
    await runner('node', ['scripts/export_notebooks.mjs', '--public']);
  }

  const astroArgs = ['astro', 'dev', '--port', port];
  if (withNetwork) astroArgs.push('--host', '0.0.0.0');

  await runner('pnpm', astroArgs);
}

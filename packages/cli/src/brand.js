// Banner respects DGK_BANNER=0 for CI/quiet mode.
// Designed to receive config from refarm when integrated as a driver.

const BANNER_LINES = [
  '╭─────────────────────────────╮',
  '│             dgk             │',
  '│   digital gardening kit     │',
  '╰─────────────────────────────╯',
];

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'no']);

export function isBannerEnabled(env = process.env) {
  const raw = env.DGK_BANNER?.trim().toLowerCase();
  if (!raw) return true;
  return !DISABLED_VALUES.has(raw);
}

export function buildBanner(version) {
  const lines = [...BANNER_LINES];
  if (version) lines.push(`version: ${version}`);
  return lines.join('\n');
}

export function printBanner(version, options = {}) {
  const env = options.env ?? process.env;
  if (!isBannerEnabled(env)) return false;
  const log = options.log ?? console.log;
  log(buildBanner(version));
  return true;
}

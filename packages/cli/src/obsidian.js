import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// On Windows, Obsidian.exe IS the CLI binary — same executable handles both app launch
// and IPC commands when registered. After registration the dir is added to user PATH,
// but the current shell may not have refreshed yet. We try both PATH and the known path.
const WIN32_FALLBACK =
  process.platform === 'win32' && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Programs', 'Obsidian', 'Obsidian.exe')
    : null;

async function trySpawn(cmd) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, ['help'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Returns the command string to use for the Obsidian CLI, or null if unreachable.
 * Tries PATH first, then the known Windows install path as a fallback.
 * Obsidian must be running and the CLI must be registered.
 */
export async function findObsidianCli() {
  if (await trySpawn('obsidian')) return 'obsidian';
  if (WIN32_FALLBACK && existsSync(WIN32_FALLBACK) && await trySpawn(WIN32_FALLBACK)) {
    return WIN32_FALLBACK;
  }
  return null;
}

export const OBSIDIAN_SETUP_HINT =
  'Instale Obsidian 1.12+ e registre o CLI em ' +
  'Configurações → Geral → Interface de linha de comando → Registrar CLI.';

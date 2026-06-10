import { spawn } from 'node:child_process';

/**
 * Checks whether the Obsidian CLI (v1.12+) is reachable.
 * The CLI is an IPC remote-control client — Obsidian must be running.
 * Returns true only when the binary exists AND responds without error.
 */
export async function findObsidianCli() {
  return new Promise((resolve) => {
    const proc = spawn('obsidian', ['help'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

export const OBSIDIAN_SETUP_HINT =
  'Instale Obsidian 1.12+ e registre o CLI em ' +
  'Configurações → Geral → Interface de linha de comando → Registrar CLI.';

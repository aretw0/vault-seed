import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawn } from 'node:child_process';

const { LOCALAPPDATA, USERPROFILE, HOME } = process.env;

const PLATFORM_PATHS = {
  darwin: [
    '/Applications/Obsidian.app',
    ...(HOME ? [`${HOME}/Applications/Obsidian.app`] : []),
  ],
  win32: [
    ...(LOCALAPPDATA
      ? [
          join(LOCALAPPDATA, 'Obsidian', 'Obsidian.exe'),
          join(LOCALAPPDATA, 'Programs', 'Obsidian', 'Obsidian.exe'),
        ]
      : []),
    // Scoop installation
    ...(USERPROFILE
      ? [join(USERPROFILE, 'scoop', 'apps', 'obsidian', 'current', 'Obsidian.exe')]
      : []),
  ],
  linux: [
    '/snap/bin/obsidian',
    '/usr/bin/obsidian',
    '/usr/local/bin/obsidian',
    ...(HOME
      ? [
          `${HOME}/.local/bin/obsidian`,
          // AppImage — common user-level install location
          `${HOME}/Applications/Obsidian.AppImage`,
          `${HOME}/.local/share/applications/Obsidian.AppImage`,
        ]
      : []),
  ],
};

/**
 * Returns { path, platform } when Obsidian is found, or null.
 * @param {string} platform - defaults to process.platform
 * @param {(path: string) => boolean} existsChecker - injectable for tests; defaults to existsSync
 */
export function detectObsidian(platform = process.platform, existsChecker = existsSync) {
  const paths = PLATFORM_PATHS[platform] ?? [];
  const found = paths.find((p) => existsChecker(p));
  return found ? { path: found, platform } : null;
}

function openUri(uri, platform = process.platform) {
  return new Promise((resolve, reject) => {
    const [cmd, args] =
      platform === 'darwin'
        ? ['open', [uri]]
        : platform === 'win32'
          ? ['cmd', ['/c', 'start', '', uri]]
          : ['xdg-open', [uri]];
    const proc = spawn(cmd, args, { stdio: 'ignore', shell: false });
    proc.on('close', resolve);
    proc.on('error', reject);
  });
}

/** Opens a vault by name via the obsidian:// URI scheme. */
export function launchVault(vaultName, platform = process.platform) {
  return openUri(
    `obsidian://open?vault=${encodeURIComponent(vaultName)}`,
    platform,
  );
}

/** Derives a vault name from the cwd (folder basename). */
export function vaultNameFromCwd(cwd = process.cwd()) {
  return basename(cwd);
}

export const INSTALL_HINTS = {
  darwin:
    'Instale o Obsidian em https://obsidian.md ou via: brew install --cask obsidian',
  win32:
    'Instale o Obsidian em https://obsidian.md ou via: winget install Obsidian.Obsidian',
  linux:
    'Instale o Obsidian via snap (sudo snap install obsidian --classic) ou Flatpak',
};

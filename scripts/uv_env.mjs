import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findWindowsPython() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return undefined;

  const pythonRoot = join(localAppData, "Python");
  if (!existsSync(pythonRoot)) return undefined;

  return readdirSync(pythonRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("pythoncore-"))
    .map((entry) => join(pythonRoot, entry.name, "python.exe"))
    .filter((candidate) => existsSync(candidate))
    .sort()
    .at(-1);
}

export function uvEnv() {
  const env = {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR || ".sandbox/uv-cache",
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || ".sandbox/config",
  };

  if (!env.UV_PYTHON && process.platform === "win32") {
    const python = findWindowsPython();
    if (python) env.UV_PYTHON = python;
  }

  return env;
}

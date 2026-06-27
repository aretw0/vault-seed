import { createLaunchProcessRunner } from '@refarm.dev/launch-process';

/**
 * Default runner: launches cmd with args via @refarm.dev/launch-process.
 * Contract: (cmd: string, args: string[], opts?: { cwd?, env? }) => Promise<void>
 * Resolves on exit 0, rejects on non-zero. Replace the engine here; the dgk-cli
 * injects this into every command, so no command code changes when it changes.
 */
export const run = createLaunchProcessRunner();

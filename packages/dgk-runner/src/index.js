import { createProcessHandoffRunner } from '@refarm.dev/process-handoff';

/**
 * Default runner: launches cmd with args via @refarm.dev/process-handoff.
 * Contract: (cmd: string, args: string[], opts?: { cwd?, env? }) => Promise<void>
 * Resolves on exit 0, rejects on non-zero. Replace the engine here; the dgk-cli
 * injects this into every command, so no command code changes when it changes.
 */
export const run = createProcessHandoffRunner();

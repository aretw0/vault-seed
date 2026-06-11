#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { validate } from './commands/validate.js';
import { lint } from './commands/lint.js';
import { setup } from './commands/setup.js';
import { check } from './commands/check.js';
import { lab } from './commands/lab.js';
import { open } from './commands/open.js';
import { note } from './commands/note.js';
import { publish } from './commands/publish.js';
import { sow } from './commands/sow.js';

const COMMANDS = { validate, lint, setup, check, lab, open, note, publish, sow };

export function resolveCommand(name) {
  return name in COMMANDS ? name : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [,, command, ...rest] = process.argv;

  if (!resolveCommand(command)) {
    console.error(`dgk: comando desconhecido '${command ?? ''}'`);
    console.error(`Uso: dgk <comando>`);
    console.error(`Comandos: ${Object.keys(COMMANDS).join(', ')}`);
    process.exit(1);
  }

  COMMANDS[command](rest).catch(err => {
    console.error(`dgk: ${err.message}`);
    process.exit(1);
  });
}

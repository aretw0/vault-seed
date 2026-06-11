#!/usr/bin/env node
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
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

function getVersion() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [,, command, ...rest] = process.argv;

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    process.exit(0);
  }

  if (!command || command === '--help' || command === '-h') {
    console.log(`dgk v${getVersion()} — Digital Gardening Kit

Uso: dgk <comando> [opções]

Comandos:
  setup              Configura o ambiente local (git, deps, Python tools)
  check              Verifica a saúde do vault (onboarding, IA, texto)
  lint               Valida o markdown do vault
  sow                Configura credenciais de publicação (~/.dgk/silo.json)
  open <alvo>        Abre um notebook (marimo) ou o vault (obsidian)
  note <cmd>         Executa um comando no Obsidian CLI
  lab <sub>          Pipeline de dados: etl, curate, evaluate, export
  publish <sub>      Publica skills e extensões no npm
  validate           Pipeline de CI completo (dev)

Instalação global:
  npm install -g @aretw0/dgk-cli

Documentação: https://github.com/aretw0/vault-seed`);
    process.exit(0);
  }

  if (!resolveCommand(command)) {
    console.error(`dgk: comando desconhecido '${command}'`);
    console.error(`Uso: dgk <comando>  |  dgk --help`);
    process.exit(1);
  }

  COMMANDS[command](rest).catch(err => {
    console.error(`dgk: ${err.message}`);
    process.exit(1);
  });
}

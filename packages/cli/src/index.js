#!/usr/bin/env node
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, realpathSync } from 'node:fs';
import { printBanner } from './brand.js';
import { validate } from './commands/validate.js';
import { lint } from './commands/lint.js';
import { setup } from './commands/setup.js';
import { check } from './commands/check.js';
import { doctor } from './commands/doctor.js';
import { evaluate } from './commands/evaluate.js';
import { lab } from './commands/lab.js';
import { obsidian } from './commands/obsidian.js';
import { note } from './commands/note.js';
import { publish } from './commands/publish.js';
import { sow } from './commands/sow.js';
import { serve } from './commands/serve.js';
import { etl } from './commands/etl.js';
import { outbox } from './commands/outbox.js';
import { inbox } from './commands/inbox.js';
import { vscode } from './commands/vscode.js';
import { preview } from './commands/preview.js';

const COMMANDS = { validate, lint, setup, check, doctor, evaluate, lab, obsidian, vscode, note, publish, sow, serve, etl, outbox, inbox, preview };

export function resolveCommand(name) {
  return name in COMMANDS ? name : null;
}

function getVersion() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

const argv1Real = (() => { try { return realpathSync(process.argv[1]); } catch { return process.argv[1]; } })();
if (argv1Real === fileURLToPath(import.meta.url)) {
  const [,, command, ...rest] = process.argv;

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    process.exit(0);
  }

  if (!command || command === '--help' || command === '-h') {
    printBanner(getVersion());
    console.log(`
Uso: dgk <comando> [opções]

Comandos:
  setup              Configura o ambiente local (git, deps, Python tools)
  doctor             Diagnostica o ambiente (node, pnpm, uv, python, binários)
  check              Verifica a saúde do vault (onboarding, IA, texto e apresentações)
  evaluate [nota]    Avalia qualidade de escrita; use --presentations para slides Marimo
  lint               Valida o markdown do vault
  sow                Configura credenciais de publicação (~/.dgk/silo.json)
  etl                Executa o pipeline de dados do vault
  outbox <canal>     Publica notas da fila para o canal (ex: telegram)
  inbox <canal>      Importa mensagens do canal para o vault (ex: telegram)
  preview [opções]   Abre o site em modo dev (--lab exporta notebooks, --network expõe na LAN, --port N)
  serve [--port N]   Inicia o painel admin local (padrão: porta 4322)
  obsidian [nome]    Abre o vault no Obsidian
  vscode             Abre o vault no VS Code (Foam pré-configurado)
  note <cmd>         Executa um comando no Obsidian CLI
  lab <sub>          Laboratório: notebooks, curate, export
  publish <sub>      Scaffolda skills e extensões Pi no npm
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

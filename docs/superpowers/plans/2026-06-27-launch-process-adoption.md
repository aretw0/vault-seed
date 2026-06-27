# Adoção do `@refarm.dev/launch-process` no dgk — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocar o spawn de processos do dgk substituindo `node:child_process` cru pelo `@refarm.dev/launch-process` (runner core + launchers/admin/setup), sem mudança de comportamento pro usuário.

**Architecture:** O runner canônico `@aretw0/dgk-runner` passa a ser backed pelo `createLaunchProcessRunner` do refarm (um ponto oca ~12 comandos). Os launches diretos do cli (Obsidian, VS Code, probe do Obsidian CLI, scripts do admin, probes síncronos do setup) passam a montar `LaunchProcessSpec` e rodar via `runLaunchProcess`/`runLaunchProcessSync`/`launchDetachedProcess`. Consumo via tarball `file:` (refarm não publicado); `dgk-runner` e `dgk-cli` ficam com publish segurado enquanto carregarem a dep `file:`.

**Tech Stack:** Node ≥22 (ESM), pnpm 11 workspace, `node:test`, `@refarm.dev/launch-process@0.1.0` (tarball do handoff).

## Global Constraints

- Pacotes são ESM (`"type": "module"`). Importar `@refarm.dev/launch-process` direto.
- Dep do refarm via `file:../../vendor/refarm.dev-launch-process-0.1.0.tgz` (vendor/ gitignored; tarball vem do handoff `refarm/.refarm/handoff/vault-seed/2026-06-26/`).
- `@refarm.dev/*` já isento da supply-chain via `minimumReleaseAgeExclude` no `pnpm-workspace.yaml` (não mexer).
- Publish-hold: `@aretw0/dgk-runner` e `@aretw0/dgk-cli` não podem ser publicados enquanto carregarem dep `file:@refarm.dev/*`.
- Preservar as seams injetáveis no nível de comando (`mockLauncher`, `runner`, `spawnFn` do `createAdminServer`) — os testes existentes injetam por ali.
- Sem mudança de comportamento observável pro usuário.
- Testes rodam com `node --test`; suíte alvo ≥344 verde + novos.
- Achados de consumo (defeitos/lacunas do `launch-process`) vão pra `docs/convergencia-refarm-feedback.md`.

---

## File Structure

- `vendor/refarm.dev-launch-process-0.1.0.tgz` — tarball vendorizado (gitignored).
- `packages/dgk-runner/package.json` — +dep `file:` launch-process.
- `packages/dgk-runner/src/index.js` — `run()` sobre launch-process.
- `packages/cli/package.json` — +dep `file:` launch-process.
- `packages/cli/src/utils.js` — remover `run()` morto (arquivo fica vazio → deletar).
- `packages/cli/src/launcher.js` — `openUri` via `launchDetachedProcess` (injetável).
- `packages/cli/src/commands/vscode.js` — `detectVSCode`/`openVSCode` via launch-process.
- `packages/cli/src/obsidian.js` — `trySpawn` via `runLaunchProcess`.
- `packages/cli/src/commands/serve.js` — `defaultSpawn` via `runLaunchProcess({capture})`.
- `packages/cli/src/commands/setup.js` — probes/git config via `runLaunchProcessSync`.
- `scripts/refarm_launch_process_consumer_contract.test.mjs` — contrato de consumidor (novo).
- `scripts/refarm_publish_hold_contract.test.mjs` — gate de publish-hold (novo).
- `scripts/no_raw_child_process_contract.test.mjs` — guard final (novo).
- `docs/convergencia-refarm-feedback.md` — ledger de feedback (novo).
- `package.json` — registrar os 3 testes novos no script `test`.

---

### Task 1: Vendorizar launch-process + fixar deps + contrato de consumidor

**Files:**
- Create: `vendor/refarm.dev-launch-process-0.1.0.tgz` (cópia do handoff)
- Modify: `packages/dgk-runner/package.json`, `packages/cli/package.json`, `package.json`
- Test: `scripts/refarm_launch_process_consumer_contract.test.mjs`

**Interfaces:**
- Produces: a dep `@refarm.dev/launch-process` resolvível em `packages/dgk-runner` e `packages/cli`; superfície `{ createLaunchProcessRunner, createLaunchProcessSpecFromRunner, runLaunchProcess, runLaunchProcessSync, launchDetachedProcess, launchProcess, createLaunchProcessSpec, createLaunchProcessDisplay, splitLaunchCommand, quoteLaunchProcessArg }`.

- [ ] **Step 1: Write the failing contract test**

Create `scripts/refarm_launch_process_consumer_contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const SPEC = "file:../../vendor/refarm.dev-launch-process-0.1.0.tgz";

test("dgk-runner and dgk-cli pin @refarm.dev/launch-process via the local tarball", () => {
  assert.equal(
    readJson("packages/dgk-runner/package.json").dependencies?.["@refarm.dev/launch-process"],
    SPEC,
  );
  assert.equal(
    readJson("packages/cli/package.json").dependencies?.["@refarm.dev/launch-process"],
    SPEC,
  );
});

test("the consumed @refarm.dev/launch-process surface is exported", () => {
  const dts = readFileSync(
    join(ROOT, "packages/dgk-runner/node_modules/@refarm.dev/launch-process/dist/index.d.ts"),
    "utf8",
  );
  for (const name of [
    "createLaunchProcessRunner",
    "createLaunchProcessSpecFromRunner",
    "runLaunchProcess",
    "runLaunchProcessSync",
    "launchDetachedProcess",
  ]) {
    assert.match(dts, new RegExp(`export declare function ${name}\\b`), `missing ${name}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/refarm_launch_process_consumer_contract.test.mjs`
Expected: FAIL (dep não fixada; e/ou arquivo `.d.ts` inexistente em node_modules).

- [ ] **Step 3: Vendorizar o tarball e fixar as deps**

```bash
cp "../../refarm/.refarm/handoff/vault-seed/2026-06-26/refarm.dev-launch-process-0.1.0.tgz" \
   vendor/refarm.dev-launch-process-0.1.0.tgz
```
(ajuste o caminho do handoff se necessário — é o repo `refarm` ao lado do `greenhouse`.)

Em `packages/dgk-runner/package.json`, adicionar em `dependencies` (criar o bloco se não existir):
```json
"dependencies": {
  "@refarm.dev/launch-process": "file:../../vendor/refarm.dev-launch-process-0.1.0.tgz"
}
```

Em `packages/cli/package.json`, adicionar em `dependencies` (já existe o bloco):
```json
"@refarm.dev/launch-process": "file:../../vendor/refarm.dev-launch-process-0.1.0.tgz"
```

- [ ] **Step 4: Instalar**

Run: `pnpm install`
Expected: instala sem erro de supply-chain (escopo `@refarm.dev/*` já isento). Como é dep nova, não há o gotcha de cache-por-path do store.

- [ ] **Step 5: Registrar o teste no `package.json`**

No script `test` do `package.json` raiz, adicionar `scripts/refarm_launch_process_consumer_contract.test.mjs` à lista (junto dos demais `scripts/*.test.mjs`).

- [ ] **Step 6: Run to verify it passes**

Run: `node --test scripts/refarm_launch_process_consumer_contract.test.mjs`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit (sem o tarball — `vendor/` segue gitignored / develop-local)**

```bash
git add packages/dgk-runner/package.json packages/cli/package.json package.json pnpm-lock.yaml scripts/refarm_launch_process_consumer_contract.test.mjs
git commit -m "feat(deps): vendor @refarm.dev/launch-process + consumer contract"
```

O tarball NÃO é commitado (gitignored). A provisão é local via Step 3 (cópia do
handoff). Provisionar no CI/repo é item deferido (ver Notas).

---

### Task 2: `@aretw0/dgk-runner` `run()` sobre launch-process

**Files:**
- Modify: `packages/dgk-runner/src/index.js`
- Test: `packages/dgk-runner/test/runner.test.js`

**Interfaces:**
- Consumes: `createLaunchProcessRunner` (Task 1).
- Produces: `run(cmd: string, args: string[], opts?: { cwd?, env? }) => Promise<void>` — resolve em exit 0, rejeita em exit≠0.

- [ ] **Step 1: Write the failing test (rejection on nonzero)**

Em `packages/dgk-runner/test/runner.test.js`, adicionar:

```js
test('run rejeita quando o processo sai com código diferente de 0', async () => {
  await assert.rejects(() => run('node', ['-e', 'process.exit(3)']));
});
```

- [ ] **Step 2: Run to verify current behavior still passes (baseline)**

Run: `node --test packages/dgk-runner/test/runner.test.js`
Expected: PASS (o `run` atual via spawn já rejeita em exit≠0 — confirma a baseline antes de trocar a engine).

- [ ] **Step 3: Reimplementar `run` sobre launch-process**

Substituir todo o conteúdo de `packages/dgk-runner/src/index.js`:

```js
import { createLaunchProcessRunner } from '@refarm.dev/launch-process';

/**
 * Default runner: launches cmd with args via @refarm.dev/launch-process.
 * Contract: (cmd: string, args: string[], opts?: { cwd?, env? }) => Promise<void>
 * Resolves on exit 0, rejects on non-zero. Replace the engine here; the dgk-cli
 * injects this into every command, so no command code changes when it changes.
 */
export const run = createLaunchProcessRunner();
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/dgk-runner/test/runner.test.js`
Expected: PASS (resolve em `node --version`; rejeita em `process.exit(3)`).

- [ ] **Step 5: Commit**

```bash
git add packages/dgk-runner/src/index.js packages/dgk-runner/test/runner.test.js
git commit -m "feat(runner): back dgk-runner run() with @refarm.dev/launch-process"
```

---

### Task 3: Remover o `run()` morto do `utils.js`

**Files:**
- Delete: `packages/cli/src/utils.js`
- Test: (suíte do cli)

**Interfaces:**
- Consumes: nada. `packages/cli/src/utils.js` só exporta `run()` e não tem importadores (o runner real é `runner.js`→`@aretw0/dgk-runner`).

- [ ] **Step 1: Confirmar zero importadores**

Run: `grep -rnE "from ['\"][^'\"]*utils(\.js)?['\"]" packages/cli/src packages/cli/test`
Expected: nenhuma linha. Se aparecer algo, **parar** e reavaliar (não deletar).

- [ ] **Step 2: Deletar o arquivo**

```bash
git rm packages/cli/src/utils.js
```

- [ ] **Step 3: Run the cli suite**

Run: `node --test packages/cli/test/*.test.js`
Expected: PASS (sem regressão — arquivo era morto).

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(cli): remove dead duplicate run() in utils.js"
```

---

### Task 4: `launcher.js` `openUri` via `launchDetachedProcess`

**Files:**
- Modify: `packages/cli/src/launcher.js`
- Test: `packages/cli/test/launcher.test.js`

**Interfaces:**
- Consumes: `createLaunchProcessSpecFromRunner`, `launchDetachedProcess`.
- Produces: `launchVault(vaultName, platform?, launchFn?)` e `openUri(uri, platform?, launchFn?)` — `launchFn` injetável (default `launchDetachedProcess`) retorna `{ unref() }`.

- [ ] **Step 1: Write the failing test (spec building + injection)**

Em `packages/cli/test/launcher.test.js`, adicionar import e teste:

```js
import { launchVault } from '../src/launcher.js';

test('launchVault monta o spec obsidian:// e desacopla via launchFn injetável', async () => {
  const calls = [];
  const fakeLaunch = (spec) => { calls.push(spec); return { unref() {} }; };
  await launchVault('meu vault', 'linux', fakeLaunch);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'xdg-open');
  assert.deepEqual(calls[0].args, ['obsidian://open?vault=meu%20vault']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/launcher.test.js`
Expected: FAIL (`launchVault` não aceita `launchFn`; usa `spawn`).

- [ ] **Step 3: Reimplementar `openUri`/`launchVault`**

Em `packages/cli/src/launcher.js`, trocar o import do topo:
```js
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createLaunchProcessSpecFromRunner, launchDetachedProcess } from '@refarm.dev/launch-process';
```

Substituir `openUri` e `launchVault`:
```js
function openUri(uri, platform = process.platform, launchFn = launchDetachedProcess) {
  const [cmd, args] =
    platform === 'darwin'
      ? ['open', [uri]]
      : platform === 'win32'
        ? ['cmd', ['/c', 'start', '', uri]]
        : ['xdg-open', [uri]];
  launchFn(createLaunchProcessSpecFromRunner(cmd, args));
  return Promise.resolve();
}

/** Opens a vault by name via the obsidian:// URI scheme. */
export function launchVault(vaultName, platform = process.platform, launchFn = launchDetachedProcess) {
  return openUri(
    `obsidian://open?vault=${encodeURIComponent(vaultName)}`,
    platform,
    launchFn,
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/launcher.test.js`
Expected: PASS (novo teste + os de `detectObsidian`/`vaultNameFromCwd`/`INSTALL_HINTS`).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/launcher.js packages/cli/test/launcher.test.js
git commit -m "feat(cli): launch Obsidian via @refarm.dev/launch-process"
```

---

### Task 5: `vscode.js` detect/open via launch-process

**Files:**
- Modify: `packages/cli/src/commands/vscode.js`
- Test: `packages/cli/test/vscode.test.js`

**Interfaces:**
- Consumes: `createLaunchProcessSpecFromRunner`, `runLaunchProcessSync`, `launchDetachedProcess`.
- Produces: `detectVSCode(runSync?) => boolean` (default `runLaunchProcessSync`); `openVSCode(cwd?, launchFn?) => Promise<void>` (default `launchDetachedProcess`).

- [ ] **Step 1: Write the failing test (detectVSCode via injeção)**

Em `packages/cli/test/vscode.test.js`, adicionar:

```js
import { detectVSCode } from '../src/commands/vscode.js';

test('detectVSCode usa runLaunchProcessSync injetável e lê exitCode', () => {
  assert.equal(detectVSCode(() => ({ exitCode: 0 })), true);
  assert.equal(detectVSCode(() => ({ exitCode: 1 })), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/vscode.test.js`
Expected: FAIL (`detectVSCode` ainda usa `spawnFn`/`status`).

- [ ] **Step 3: Reimplementar `detectVSCode`/`openVSCode`**

Em `packages/cli/src/commands/vscode.js`, trocar o import do topo:
```js
import {
  createLaunchProcessSpecFromRunner,
  runLaunchProcessSync,
  launchDetachedProcess,
} from '@refarm.dev/launch-process';
```

Substituir as duas funções:
```js
/** Returns true if the `code` CLI is reachable. runSync injectable for tests. */
export function detectVSCode(runSync = runLaunchProcessSync) {
  const { exitCode } = runSync(
    createLaunchProcessSpecFromRunner('code', ['--version']),
    { capture: true },
  );
  return exitCode === 0;
}

/** Opens the current directory in VS Code. launchFn injectable for tests. */
export function openVSCode(cwd = process.cwd(), launchFn = launchDetachedProcess) {
  launchFn(createLaunchProcessSpecFromRunner('code', ['.'], { cwd }));
  return Promise.resolve();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/vscode.test.js`
Expected: PASS (novo teste + os de comando via `mockLauncher`).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/vscode.js packages/cli/test/vscode.test.js
git commit -m "feat(cli): detect/open VS Code via @refarm.dev/launch-process"
```

---

### Task 6: `obsidian.js` (`src/obsidian.js`) `trySpawn` via `runLaunchProcess`

**Files:**
- Modify: `packages/cli/src/obsidian.js`
- Test: `packages/cli/test/obsidian_cli.test.js` (novo)

**Interfaces:**
- Consumes: `createLaunchProcessSpecFromRunner`, `runLaunchProcess`.
- Produces: `findObsidianCli(runProc?) => Promise<string|null>` — `runProc` injetável (default `runLaunchProcess`), assinatura `(spec, opts) => Promise<{exitCode}>`.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/test/obsidian_cli.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findObsidianCli } from '../src/obsidian.js';

test('findObsidianCli retorna "obsidian" quando o probe sai com exitCode 0', async () => {
  const runProc = async (spec) => ({ exitCode: spec.command === 'obsidian' ? 0 : 1 });
  assert.equal(await findObsidianCli(runProc), 'obsidian');
});

test('findObsidianCli retorna null quando o probe rejeita (ausente)', async () => {
  const runProc = async () => { throw new Error('ENOENT'); };
  assert.equal(await findObsidianCli(runProc), null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/obsidian_cli.test.js`
Expected: FAIL (`findObsidianCli` não aceita `runProc`).

- [ ] **Step 3: Reimplementar `trySpawn`/`findObsidianCli`**

Em `packages/cli/src/obsidian.js`, trocar o import do topo:
```js
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLaunchProcessSpecFromRunner, runLaunchProcess } from '@refarm.dev/launch-process';
```

Substituir `trySpawn` e a assinatura de `findObsidianCli`:
```js
async function trySpawn(cmd, runProc) {
  try {
    const { exitCode } = await runProc(
      createLaunchProcessSpecFromRunner(cmd, ['help']),
      { capture: true },
    );
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function findObsidianCli(runProc = runLaunchProcess) {
  if (await trySpawn('obsidian', runProc)) return 'obsidian';
  if (WIN32_FALLBACK && existsSync(WIN32_FALLBACK) && await trySpawn(WIN32_FALLBACK, runProc)) {
    return WIN32_FALLBACK;
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/obsidian_cli.test.js packages/cli/test/obsidian.test.js`
Expected: PASS (novo + o de comando).

- [ ] **Step 5: Registrar o teste novo no `package.json`** (lista do script `test`, em `packages/cli/test/...`).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/obsidian.js packages/cli/test/obsidian_cli.test.js package.json
git commit -m "feat(cli): probe Obsidian CLI via @refarm.dev/launch-process"
```

---

### Task 7: `serve.js` `defaultSpawn` via `runLaunchProcess({capture})`

**Files:**
- Modify: `packages/cli/src/commands/serve.js`
- Test: `packages/cli/test/serve.test.js`

**Interfaces:**
- Consumes: `createLaunchProcessSpecFromRunner`, `runLaunchProcess`.
- Produces: `defaultSpawn(cmd, args, cwd) => Promise<{ ok: boolean, output: string }>` (inalterado na superfície; só a engine muda). `createAdminServer(..., { spawnFn })` mantém `spawnFn` injetável.

- [ ] **Step 1: Write the failing test (defaultSpawn real)**

Em `packages/cli/test/serve.test.js`, adicionar:

```js
import { defaultSpawn } from '../src/commands/serve.js';

test('defaultSpawn captura stdout e marca ok em exit 0', async () => {
  const r = await defaultSpawn('node', ['-e', "process.stdout.write('hi')"], process.cwd());
  assert.equal(r.ok, true);
  assert.equal(r.output, 'hi');
});

test('defaultSpawn marca ok=false em exit != 0', async () => {
  const r = await defaultSpawn('node', ['-e', 'process.exit(2)'], process.cwd());
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: Run to verify it fails or passes**

Run: `node --test packages/cli/test/serve.test.js`
Expected: o `defaultSpawn` atual (via spawn) provavelmente JÁ passa estes — rodar para confirmar a baseline antes de trocar a engine. Se passar, seguir (são caracterização do comportamento a preservar).

- [ ] **Step 3: Reimplementar `defaultSpawn`**

Em `packages/cli/src/commands/serve.js`, remover `import { spawn } from 'node:child_process';` e adicionar:
```js
import { createLaunchProcessSpecFromRunner, runLaunchProcess } from '@refarm.dev/launch-process';
```

Substituir `defaultSpawn`:
```js
// Launches a script and captures stdout+stderr. Used by operation endpoints
// so Pi can receive the output and relay it back via Telegram.
export async function defaultSpawn(cmd, args, cwd) {
  try {
    const { exitCode, stdout, stderr } = await runLaunchProcess(
      createLaunchProcessSpecFromRunner(cmd, args, { cwd }),
      { capture: true },
    );
    return { ok: exitCode === 0, output: `${stdout}${stderr}`.trim() };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/serve.test.js`
Expected: PASS (novos testes + os de endpoint via `spawnFn` injetado, intactos).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/serve.js packages/cli/test/serve.test.js
git commit -m "feat(cli): admin defaultSpawn via @refarm.dev/launch-process"
```

---

### Task 8: `setup.js` probes/git config via `runLaunchProcessSync`

**Files:**
- Modify: `packages/cli/src/commands/setup.js`
- Test: `packages/cli/test/setup.test.js` (novo)

**Interfaces:**
- Consumes: `createLaunchProcessSpecFromRunner`, `runLaunchProcessSync`.
- Produces: `hasTool(cmd, runSync?) => boolean` (helper de presença, `runSync` injetável); `git(args, runSync?)` (config não-fatal). `setup(args, runner)` inalterado na superfície.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/test/setup.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasTool } from '../src/commands/setup.js';

test('hasTool true quando runSync retorna exitCode 0', () => {
  assert.equal(hasTool('uv', () => ({ exitCode: 0 })), true);
});

test('hasTool false quando runSync retorna exitCode != 0 (ausente)', () => {
  assert.equal(hasTool('uv', () => ({ exitCode: 1 })), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test packages/cli/test/setup.test.js`
Expected: FAIL (`hasTool` não existe / não exportado).

- [ ] **Step 3: Reimplementar as chamadas síncronas**

Em `packages/cli/src/commands/setup.js`, trocar o import do topo:
```js
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLaunchProcessSpecFromRunner, runLaunchProcessSync } from '@refarm.dev/launch-process';
import { detectObsidian, INSTALL_HINTS } from '../launcher.js';
```

Substituir `git()` e adicionar `hasTool()`:
```js
function git(args, runSync = runLaunchProcessSync) {
  // git config errors are non-fatal (e.g. not in a repo)
  runSync(createLaunchProcessSpecFromRunner('git', args), { capture: true });
}

/** True if `cmd --version` is reachable. runLaunchProcessSync swallows ENOENT into exitCode. */
export function hasTool(cmd, runSync = runLaunchProcessSync) {
  const { exitCode } = runSync(
    createLaunchProcessSpecFromRunner(cmd, ['--version']),
    { capture: true },
  );
  return exitCode === 0;
}
```

Em `installPythonTools`, trocar os dois probes `execFileSync(...)`/try-catch por `hasTool`:
```js
async function installPythonTools(runner) {
  if (!hasTool('uv')) {
    console.log('  uv não encontrado — git-filter-repo não instalado.');
    console.log('  Instale uv: https://docs.astral.sh/uv/getting-started/installation/');
    return;
  }
  // Check PATH first — may have been installed via pipx or manually
  if (hasTool('git-filter-repo')) {
    console.log('✓ git-filter-repo já disponível no PATH');
    return;
  }
  try {
    await runner('uv', ['tool', 'install', 'git-filter-repo']);
    console.log('✓ git-filter-repo instalado via uv');
  } catch {
    console.log('  Aviso: não foi possível instalar git-filter-repo. Instale manualmente: uv tool install git-filter-repo');
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test packages/cli/test/setup.test.js`
Expected: PASS.

- [ ] **Step 5: Registrar o teste novo no `package.json`** (lista do script `test`).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/setup.js packages/cli/test/setup.test.js package.json
git commit -m "feat(cli): setup probes/git config via @refarm.dev/launch-process"
```

---

### Task 9: Gate de publish-hold + guard "sem child_process cru" + ledger de feedback

**Files:**
- Create: `scripts/refarm_publish_hold_contract.test.mjs`
- Create: `scripts/no_raw_child_process_contract.test.mjs`
- Create: `docs/convergencia-refarm-feedback.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: os manifests/fontes das Tasks 1–8.

- [ ] **Step 1: Write the failing publish-hold gate**

Create `scripts/refarm_publish_hold_contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// Pacotes @aretw0/* publicáveis que carregam dep file:@refarm.dev/* DEVEM
// declarar o publish-hold para não vazarem no fluxo de release.
const PUBLISHABLE = [
  "packages/cli/package.json",
  "packages/dgk-runner/package.json",
  "packages/channels/package.json",
  "packages/dgk-astro-plugins/package.json",
];

test("pacotes publicáveis com dep file:@refarm.dev/* declaram release hold", () => {
  for (const p of PUBLISHABLE) {
    let pkg;
    try { pkg = readJson(p); } catch { continue; }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasFileRefarm = Object.entries(deps).some(
      ([name, spec]) => name.startsWith("@refarm.dev/") && String(spec).startsWith("file:"),
    );
    if (hasFileRefarm) {
      assert.equal(
        pkg.dgk?.releaseHold,
        "refarm-unpublished",
        `${p} carrega dep file:@refarm.dev/* — precisa de "dgk.releaseHold":"refarm-unpublished"`,
      );
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/refarm_publish_hold_contract.test.mjs`
Expected: FAIL (dgk-runner e dgk-cli têm a dep file: mas não o marcador).

- [ ] **Step 3: Marcar o publish-hold nos manifests**

Em `packages/dgk-runner/package.json` e `packages/cli/package.json`, adicionar no topo do objeto:
```json
"dgk": { "releaseHold": "refarm-unpublished" }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/refarm_publish_hold_contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the "no raw child_process" guard**

Create `scripts/no_raw_child_process_contract.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const MIGRATED = [
  "packages/dgk-runner/src/index.js",
  "packages/cli/src/launcher.js",
  "packages/cli/src/obsidian.js",
  "packages/cli/src/commands/vscode.js",
  "packages/cli/src/commands/serve.js",
  "packages/cli/src/commands/setup.js",
];

test("nenhum import cru de node:child_process nos arquivos migrados", () => {
  for (const p of MIGRATED) {
    assert.doesNotMatch(read(p), /from ['"]node:child_process['"]/, `${p} ainda importa node:child_process`);
  }
});
```

- [ ] **Step 6: Run to verify it passes**

Run: `node --test scripts/no_raw_child_process_contract.test.mjs`
Expected: PASS (Tasks 2,4,5,6,7,8 removeram os imports).

- [ ] **Step 7: Criar o ledger de feedback**

Create `docs/convergencia-refarm-feedback.md`:

```markdown
# Feedback de consumo pro refarm

vault-seed como primeiro consumidor externo. Captura de defeitos e lacunas dos
pacotes `@refarm.dev/*`. Itens essenciais relayados pro refarm.

## Defeitos (pra refarm corrigir)

| Pacote | Versão | Sintoma | Repro/evidência | Status |
| --- | --- | --- | --- | --- |
| — | — | (nenhum até agora) | — | — |

## Lacunas essenciais (backlog pro refarm)

| Pacote | O que falta | Por que é essencial | Workaround | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## Avaliação de cobertura

- `launch-process@0.1.0` — cobriu runner async, detached, capture e sync
  (`runLaunchProcessSync`) sem lacuna na adoção do dgk. ✓
```

- [ ] **Step 8: Registrar os 2 testes novos no `package.json`** (lista do script `test`).

- [ ] **Step 9: Run the full suite**

Run: `pnpm test`
Expected: PASS (≥344 + novos).

- [ ] **Step 10: Commit**

```bash
git add scripts/refarm_publish_hold_contract.test.mjs scripts/no_raw_child_process_contract.test.mjs docs/convergencia-refarm-feedback.md packages/dgk-runner/package.json packages/cli/package.json package.json
git commit -m "feat(cli): publish-hold gate + no-raw-child_process guard + refarm feedback ledger"
```

---

## Verificação final (gate de validação)

- [ ] `pnpm test` ≥344 + novos, verde.
- [ ] `grep -rnE "from ['\"]node:child_process['\"]" packages/dgk-runner/src packages/cli/src` → vazio.
- [ ] Smoke manual (onde possível): `dgk` abre Obsidian/VS Code; `dgk serve` executa um script e retorna o stdout no JSON; `dgk setup` detecta uv/git-filter-repo.
- [ ] `docs/convergencia-refarm-feedback.md` existe e a linha de cobertura do `launch-process` está preenchida (ou defeitos/lacunas registrados, se surgirem).
- [ ] `node --test scripts/refarm_publish_hold_contract.test.mjs` verde (publish-hold marcado).
- [ ] Postura mantida: nada publicado; acumula na `develop`.

## Notas / itens deferidos

- **Enforcement real do publish-hold no workflow de release** (além do teste de
  contrato): garantir que o job de publish pule pacotes com `dgk.releaseHold`.
  Desenhar quando formos liberar — hoje a postura "sem PR pra main até o refarm
  publicar" já evita o disparo.
- **Provisionamento de `vendor/` no CI** ao PR-ar develop→main (commitar tarballs
  curados) — deferido.
- **`opts` arbitrários no `run` antigo**: o `createLaunchProcessRunner` honra
  `cwd`/`env` via `options`, mas não `stdio` custom. Se algum comando passar
  `stdio` próprio (improvável — todos usam o default), tratar como achado.

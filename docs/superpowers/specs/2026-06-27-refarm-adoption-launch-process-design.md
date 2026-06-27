# Design — Ocamento do vault-seed: programa de adoção do refarm + 1ª adoção (`launch-process`)

> Status: design aprovado (2026-06-27). Cobre o **mapa do programa** de ocamento
> e detalha a **primeira adoção** (`@refarm.dev/launch-process`) pronta pra virar
> plano de implementação.

## Contexto e objetivo

A estrela-guia do ecossistema é o **vault-seed oco**: uma camada fina de produto
que **importa o refarm como SDK** em vez de reimplementar as primitivas. O
vault-seed "esticou a corda" reimplementando máquina que o refarm vai fornecer; o
objetivo é reverter isso, adoção a adoção.

Restrição vigente: o refarm **não publicou** no npm (publicação retida pelo
daily-driver gate — ver `docs/convergencia-refarm-deps.md`). O consumo suportado
é via **tarball local** do handoff (`file:vendor/*.tgz`), lane `vault-seed-ready`.
A postura de release não muda: **acumula na `develop`, sem PR pra `main` até o
refarm publicar**.

Ocar = **parar de reimplementar o que o refarm fornece**. Não significa adotar
conceitos do refarm que o vault-seed não usa.

## Mapa do programa

Quatro adoções independentes, cada uma com seu próprio ciclo spec→plano→
implementação, em ordem de risco/acoplamento crescente:

| Ordem | Adoção | Substitui no vault-seed | Tier | Notas |
| --- | --- | --- | --- | --- |
| **1ª** | `launch-process` | `spawn` ad-hoc no cli | 2 | ESM puro, sem deps transitivas refarm. *Esta spec.* |
| 2ª | `channel-policy-v1` | envelope do outbox / `dgk-channels` | 2 | Aditivo: construímos delivery-evidence/idempotency em cima. |
| 3ª | `homestead-ssr` | HTML do admin no `serve.js` | 2 | Depende de `ds` (vendorizado) → `pnpm.overrides`. |
| 4ª | `release-engine` | pipeline de release (changesets) | 2 | O nosso funciona (v0.4.0); maior superfície → por último. |

**Tiers (restrição de publicação):**

- **Tier 2** — pacotes `@aretw0/*` publicados (dgk-cli, dgk-channels). Um pacote
  publicado **não pode** carregar dep `file:vendor/*.tgz` (quem instala da npm não
  resolve). Eles ocam de verdade só quando o refarm publicar; até lá acumulam na
  `develop` com `file:` e **publish segurado**.
- **Tier 1** — código não-publicado como biblioteca (scripts da raiz, site,
  ferramentas internas). Dep `file:` é livre. (Nenhuma das 4 adoções acima é
  Tier 1 hoje; registrado para futuras.)

**Fora do programa:** `effort-contract-v1` e `dispatch-surface` (conceitos de
runtime do refarm que o vault-seed não reimplementa — adotá-los seria *adicionar*
escopo); `artifact-contract-v1` (tangencial — entra só se uma adoção acima puxar,
ex.: provenance de processo do `launch-process`).

## Padrão de consumo canônico (vale para as 4)

1. Tarball do handoff → `file:vendor/<pkg>.tgz` no `package.json` do **consumidor**.
2. `@refarm.dev/*` isento da auditoria de supply-chain via
   `minimumReleaseAgeExclude` no `pnpm-workspace.yaml` (já feito no refresh do ds).
3. Dep transitiva não-publicada → `pnpm.overrides` pro tarball local até publicar.
4. **Um teste de contrato de consumidor por adoção**, espelhando
   `scripts/refarm_ds_consumer_contract.test.mjs`: trava o `file:` dep e a
   superfície importada (subpaths/símbolos consumidos).
5. **Publish-hold**: enquanto um `@aretw0/*` carregar `file:` refarm, ele não é
   publicado (gate no fluxo de release). O gate some quando trocar `file:`→npm.
6. **TODO deferido (não bloqueia a develop):** provisionar `vendor/` para o CI/
   release (o `vendor/` é gitignored e o CI faz `pnpm install --frozen-lockfile`
   só em `main`/PR-pra-`main`). Caminho simples: commitar os tarballs curados
   quando formos PR-ar develop→main. Enquanto a postura "sem PR pra main até o
   refarm publicar" valer, o arranjo `file:`+vendor-local é **develop-local** e
   não toca o CI; quando o refarm publicar, troca-se `file:`→npm e o problema some.

### Transição no publish (quando `@refarm.dev/<pkg>` sair na npm)

`file:vendor/<pkg>.tgz` → `"^<versão>"`; `pnpm install`; remover o `.tgz`; remover
o publish-hold do `@aretw0/*` afetado. Código consumidor **não muda** na transição.

## Loop de feedback pro refarm

O vault-seed é o **primeiro consumidor externo** do refarm; consumir é o teste.
Toda adoção captura achados num ledger versionado:
`docs/convergencia-refarm-feedback.md`, com duas seções:

- **Defeitos** — bugs no pacote do refarm (pacote, versão, sintoma, repro/
  evidência, status `aberto`/`relayado`/`corrigido`).
- **Lacunas essenciais** — capability que falta pra ocar de verdade (o que,
  por que é essencial, workaround atual). Itens essenciais entram no **backlog do
  refarm** (relay quando rodarmos no devcontainer do refarm / via handoff).

Avaliação contínua: a cada adoção, registrar se o bloco do refarm **cobriu** o que
precisávamos sem reimplementação. Se faltou o essencial, é sinal pro refarm
priorizar antes de seguirmos.

## 1ª adoção — `launch-process` no `@aretw0/dgk-cli`

Abordagem **A (troca no runner seam)**: todo launch de processo do cli passa a
vir de specs/`runner` do `@refarm.dev/launch-process`; `node:child_process` sai
dos arquivos de comando, centralizado/eliminado no runner. Interno — **sem
mudança de comportamento pro usuário**.

### Superfície consumida (a travar no contrato)

`LaunchProcessSpec` (tipo); `createLaunchProcessSpecFromRunner`,
`createLaunchProcessSpec`, `createLaunchProcessDisplay`, `splitLaunchCommand`,
`quoteLaunchProcessArg`; `runLaunchProcess` (com `capture`), `launchProcess`,
`launchDetachedProcess`, `createLaunchProcessRunner`.

### Componentes e fluxo

- **`packages/cli/package.json`** — adicionar
  `"@refarm.dev/launch-process": "file:../../vendor/refarm.dev-launch-process-0.1.0.tgz"`
  em `dependencies`. Vendorizar o tarball do handoff.
- **`packages/cli/src/utils.js`** — `run(cmd, args, opts)` reescrito como o
  **runner único** backed por `runLaunchProcess`: monta `LaunchProcessSpec` via
  `createLaunchProcessSpecFromRunner(cmd, args, { cwd, display, ...opts })` e
  executa. Mantém a assinatura `(cmd, args, opts) => Promise<void>` (rejeita em
  exit≠0) — consumidores existentes não mudam.
- **`packages/cli/src/launcher.js`** — `openUri` monta spec e usa
  `launchDetachedProcess` (abre Obsidian e desacopla). Preserva a seam de teste
  (`platform`/`existsChecker`) e a de spawn injetável.
- **`packages/cli/src/vscode.js`** — `openVSCode` via `launchDetachedProcess`;
  `detectVSCode` (`code --version`) via `runLaunchProcess({ capture:true })`.
  Preservar `spawnFn` injetável (os testes injetam).
- **`packages/cli/src/obsidian.js`** — probe `<cmd> help` via
  `runLaunchProcess({ capture:true })`.
- **`packages/cli/src/commands/serve.js`** — o `spawnFn('node', args, root)` do
  admin monta spec + `runLaunchProcess({ capture:true })` (a resposta JSON do
  admin usa o stdout). Manter o `spawnFn` injetável do `createAdminServer`.

### Fora desta adoção (YAGNI)

- **`setup.js`** (`execFileSync` síncrono de git/uv/git-filter-repo): semântica
  síncrona/diferente; limpeza posterior, não agora.
- Provenance via `artifact-contract-v1`: só se necessário depois.

### Verificação

- Novo `scripts/refarm_launch_process_consumer_contract.test.mjs`: trava o `file:`
  dep + os símbolos importados do `launch-process`.
- Testes existentes do cli (`launcher.test.js`, `vscode.test.js`, `serve.test.js`,
  `obsidian.test.js`, …) **verdes sem alterar as asserções** — as seams injetáveis
  (`spawnFn`, `existsChecker`, `platform`) são preservadas; os specs alimentam o
  mesmo runner injetável.
- `pnpm test` ≥344 verde.
- Smoke manual: `dgk` abre Obsidian/VSCode; admin (`dgk serve`) executa scripts e
  retorna o stdout no JSON.
- Publish-hold ativo: `@aretw0/dgk-cli` não entra em publish enquanto carregar o
  `file:` (gate + verificação no `release_package_smoke`/fluxo de release).

## Riscos e itens deferidos

- **Provisionamento de `vendor/` no CI/release** — deferido enquanto não houver PR
  pra main; ao PR-ar, commitar os tarballs curados.
- **Publish-hold** precisa de gate real no fluxo de release pra não publicar o
  dgk-cli com `file:` por engano — desenhar no plano de implementação.
- **Achados de consumo** podem revelar defeitos/lacunas no `launch-process` →
  registrar no loop de feedback; lacuna essencial pausa o avanço até o refarm
  atacar.

## Critérios de sucesso

1. `dgk-cli` não importa mais `node:child_process` nos arquivos de comando; todo
   launch vem do `@refarm.dev/launch-process` via runner único.
2. Comportamento do usuário inalterado; suíte + smokes verdes.
3. Contrato de consumidor do `launch-process` no `pnpm test`.
4. Publish-hold do dgk-cli garantido.
5. Loop de feedback pro refarm criado e populado com o que surgir.

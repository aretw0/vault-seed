# Changelog

## 0.4.2

### Patch Changes

- a37540f: Generalize internal downstream-instance references to vendor-neutral phrasing in
  the architecture docs and the frontmatter utility comment, drop a maintainer-local
  checkout path from the technical docs, and harden the doc boundary contract to
  catch relative sibling-checkout and internal-reference regressions.

## 0.4.1

### Patch Changes

- 7e80f78: v0.4.1: footer author configurável, fronteira template/usuário e documentação dos pacotes.

  **Footer — author/holder configurável** — o nome do titular no rodapé agora vira
  link quando há `license.holderUrl` em `vault.config.json` (Footer renderiza
  `activeHolderUrl`; uma nota pode sobrescrever via frontmatter `authorUrl`). O
  `initialize.yml` deriva o owner de `GITHUB_REPOSITORY` e define
  `license.holder`/`license.holderUrl` para o perfil do novo dono — antes o vault
  gerado herdava silenciosamente a identidade do mantenedor (só o `kudos` era
  limpo). Para o vault-seed, o holder aponta para `github.com/aretw0`.

  **Inicialização** — `initialize.yml` agora também remove `publish-lab-runtime.yml`
  (publish PyPI, exclusivo do trusted publisher do mantenedor) e
  `scripts/lab_runtime_version_contract.test.mjs`, que o glob de testes do vault
  gerado executaria. O `smoke_template.js` ganhou um contrato que calcula do disco
  que todo `publish-*.yml` e os contratos de versão de mantenedor estejam na lista
  de remoção — um futuro workflow de publish ou guard de versão não vaza
  silenciosamente para vaults de usuário.

  **Documentação dos pacotes** — READMEs adicionados aos pacotes publicáveis que
  não tinham (`@aretw0/dgk-astro-plugins`, `@aretw0/dgk-channels`,
  `@aretw0/dgk-runner`, `@aretw0/dgk-skills`); `dgk-lab-runtime` promovido a
  `Development Status :: 4 - Beta`; o ROADMAP do CLI foi realocado de um diretório
  órfão para `packages/cli/`.

## 0.4.0

### Minor Changes

- 18804e4: v0.4: CLI publishing pipeline, presentations, notebook contracts and reliability fixes.

  ## Inicialização

  **`initialize.yml`** — protege o branch `main` contra force-push e exclusões e habilita GitHub Pages automaticamente no primeiro push do usuário. Fecha #55 e #56.

  ## Lab e Notebooks

  **Apresentações** — quatro notebooks Marimo de apresentação substituem o antigo `apresentacao-vault-seed.py`. Cada um cobre um aspecto distinto: visão geral, o Lab, fluxo de publicação e integração com agentes de IA. Os slides ficam em `99 - Meta e Anexos/Notebooks/apresentacoes/` com layouts nativos do Marimo (`layout_file`). A página `/lab/` agora separa notebooks analíticos de apresentações em seções distintas.

  **Notas de referência** — pasta `99.4 - Apresentações/` com cinco notas publicadas (MOC + uma por apresentação). Tags mapeiam cada nota ao intent correto da sidebar: `meta/onboarding` → "Começar", `meta/lab` → "Explorar", `meta/site` → "Publicar", `meta/agentes` → "Automatizar".

  **Contratos dinâmicos de notebook** — `scripts/notebook_cell_output_lint.test.mjs` reescrito sem listas hardcoded: `discoverNotebooks()` descobre automaticamente todos os notebooks em `99 - Meta e Anexos/Notebooks/`, e o contrato de chaves do runtime é derivado diretamente de `_lab_notebook_runtime.py`. Cobertura sobe de 5 para 20 notebooks testados.

  **Starters migrados** — `explorador.py` e `revisao-diaria.py` migrados para `_lab_notebook_runtime` (removido inline `try: import pyodide`). Violações de lint corrigidas: células com múltiplos `mo.*()` top-level encapsuladas em `mo.vstack([...])`.

  **Runtime helper injection** — fix `SyntaxError: '(' was never closed` em notebooks cujo `marimo.App()` ocupa múltiplas linhas. Rastreamento de profundidade de parênteses localiza corretamente o `)` de fechamento. Testes de regressão adicionados.

  ## CLI e Publicação

  **`dgk sow`** — wizard interativo de credenciais para Telegram. Armazena tokens em `~/.dgk/silo.json` com permissões `0o600`. Verifica credenciais contra a API real antes de salvar. Descobre e persiste contatos do Telegram no primeiro setup. `dgk sow list` mascara valores armazenados. `dgk sow remove` distingue serviço desconhecido de credencial não configurada.

  **`dgk serve` — hardening** — import de `dgk-channels/contacts` agora é dinâmico (não quebra em vaults sem o pacote instalado). Verificação de token Telegram via `GET /bot<token>/getMe` antes de persistir. Filtragem de tokens por allowlist explícita por serviço (impede vazamento de variáveis de ambiente não autorizadas).

  **`dgk open / note`** — comandos top-level substituindo `dgk lab open` e `dgk lab note`. `dgk open obsidian` abre o vault via URI scheme; `dgk open <nome>` abre notebook Marimo por nome curto.

  **`dgk lab`** — exclusivamente pipeline: `etl`, `curate`, `evaluate`, `export`. Comandos de navegação promovidos ao nível raiz.

  **Workflow pnpm-free** — `dgk check` e `dgk lint` chamam scripts diretamente via `node`; usuários não precisam conhecer pnpm.

  **`dgk setup` cross-platform** — reescrito em JavaScript puro. Sem dependência de `bash`. Funciona no Windows sem Git Bash ou WSL.

  ## Fixes de Confiabilidade

  **Rate limiter** (`dgk-channels`) — recheck de `minDelayMs` após sleep de burst-window. Sem o fix, uma mensagem enviada imediatamente após a janela de burst poderia violar o intervalo mínimo entre envios.

  **Inbox do Telegram** — nome de arquivo agora inclui `message_id` como sufixo (`{ts} from telegram--{id}.md`). Impede perda silenciosa de mensagens chegando no mesmo minuto.

  **ETL de feeds** (`curate_feeds_ia.py`) — import `urllib.request` restaurado. Ausência causava `NameError` no primeiro ciclo de coleta.

  ## Extensibilidade

  **`@aretw0/dgk-skills`** — pacote Pi-compatível com cinco skills declarativas (`vault-context`, `vault-search`, `vault-read`, `vault-create`, `vault-daily`). Ensina agentes a interagir com o vault via Obsidian CLI. Instalável via `pi install npm:@aretw0/dgk-skills`.

  **`dgk publish skill / extension`** — scaffold para novos pacotes de skills Pi e extensões TypeScript com workflow de publicação via tag GitHub Actions.

  ## CI e Qualidade

  **CI** — `test:python` removido do script `validate`; exclusivo do job `test-python` que instala `uv`. Corrige falhas `uv: not found` no runner de validação.

  **`smoke_user_vault.mjs`** — lista `RESET_ON_INIT` sincronizada com as novas notas da pasta `99.4 - Apresentações/`. Contrato G detecta notas `published` que escapariam ao usuário sem reset.

## 0.3.1

### Patch Changes

- 5ad1091: Fix invisible and broken content in published notebooks, clarify attachment folder documentation, and resolve Astro 6 deprecation warning.

  **Notebooks — WASM runtime fix:** Lab notebooks were throwing a NameError popup in the browser. Root cause: `_lab_notebook_runtime.py` contains `from dgk_lab_runtime import *`, and marimo's AST parser converts any cell with a wildcard import to `app._unparsable_cell(...)`, which is never executed in the WASM runtime. Fixed by extracting only the inline fallback function definitions (the `except ImportError:` block body) before injecting them into the exported cell — no wildcard import, no unparsable cell.

  **Notebooks — cell output fix:** In marimo, only the last evaluated expression in a cell body is shown as visual output. All "Lane de entendimento" sections had 5 consecutive `mo.md()` calls — only the last was visible. Section headings preceding `mo.ui.table()` / `mo.ui.altair_chart()` were also silently discarded. Fixed by combining sequential `mo.md()` calls into a single call and wrapping heading+table pairs with `mo.vstack()`. Also fixes a broken f-string in the `analise-publicacao.py` header cell and a hidden checkbox widget in `etl-demo.py`. Regression tests added (`notebook_cell_output_lint.test.mjs`, `notebook_export_runtime_helpers.test.mjs`).

  **Docs:** Corrected `Attachments/` → `Anexos/` naming in `organizacao-do-projeto.md`, `Entendendo a Estrutura de Pastas.md`, and `README.md`. Clarified that `99 - Meta e Anexos/Anexos/` is the global attachment sink configured for the entire vault.

  **Astro:** Migrated `markdown.remarkPlugins` to `markdown.processor: unified({...})` from `@astrojs/markdown-remark` to silence the Astro 6 deprecation warning.

  **pnpm supply-chain policy:** Added `pnpm-workspace.yaml` with `policies.minimumReleaseAge.severity: warn` so that template users' CI doesn't fail with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` when pnpm v11 considers recently-published packages (including Astro ecosystem updates) too new. The template maintainer curates all dependencies; the pnpm v11 `error` default is too strict for a curated template repo.

## 0.3.0

### Minor Changes

- 4c79e8c: Add deterministic Lab dataset preparation for local snapshots and runtime data sources, and remove the unsupported `dgk release` command until a generated-vault release flow exists.
- 4c79e8c: Polish the published site and Lab mobile experience with a LAN preview script, mobile theme controls, clearer Lab sidebar placement, aligned cards, calmer graph previews, and a Marimo shell that leaves fullscreen control to the notebook runtime.
- 92b2014: Breaking change: pastas PARA renomeadas para português.

  | Antes                   | Depois             |
  | ----------------------- | ------------------ |
  | 00 - Inbox              | 00 - Entrada       |
  | 10 - Fleeting & Daily   | 10 - Diário        |
  | 20 - Projects           | 20 - Projetos      |
  | 30 - Areas              | 30 - Áreas         |
  | 40 - Resources          | 40 - Recursos      |
  | 50 - Archives           | 50 - Arquivo       |
  | 90 - Templates          | 90 - Modelos       |
  | 99 - Meta & Attachments | 99 - Meta e Anexos |

  Migração manual para vaults existentes: renomeie as pastas no explorador de arquivos e execute find & replace nos arquivos .md para atualizar wikilinks com os novos nomes.

### Patch Changes

- Updated dependencies [efcee90]
  - @aretw0/dgk-astro-plugins@0.2.0

All notable changes to this project will be documented in this file.

### [0.2.11](https://github.com/aretw0/vault-seed/compare/v0.2.9...v0.2.11) (2026-05-19)

### ✨ Novos Recursos

- **ai:** centralize assistant instructions ([a705b8c](https://github.com/aretw0/vault-seed/commit/a705b8cf77b49df9d9587e3dcda52d63d16d1bd5))
- **onboarding:** enrich vault exploration examples ([52fd221](https://github.com/aretw0/vault-seed/commit/52fd221421feccb14bb15dedcf65e1ff4b7b7583))
- **onboarding:** improve vault setup journey ([4bd8ac8](https://github.com/aretw0/vault-seed/commit/4bd8ac8610ea2a6902a0aba5ad7d7ffffc0bdd91))

### 📚 Documentação

- **release:** align versioning playbook with automation ([d44b291](https://github.com/aretw0/vault-seed/commit/d44b291a79238080defbd41c0a3d77696ccbc150))

### 🐛 Correções

- adjust .gitignore ([a7a9e05](https://github.com/aretw0/vault-seed/commit/a7a9e0597bf5ff7c4e10c8b1e8bdeddc756deccb))
- **ci:** configure release git identity before rebase ([89e6186](https://github.com/aretw0/vault-seed/commit/89e6186913a2606a5143cae3a11be0923350ef3e))
- **ci:** create release PRs from develop ([3525739](https://github.com/aretw0/vault-seed/commit/3525739f3eedd97ababed0a1162c1494896c87d9))
- **ci:** harden vault validation and release workflows ([122a15f](https://github.com/aretw0/vault-seed/commit/122a15fd0d64648268f8ec8e201bf8a4fdcd619c))
- **ci:** keep audit report informational ([28c9d6b](https://github.com/aretw0/vault-seed/commit/28c9d6b9a8be1b8b37a092c2a5d89a1f72e69453))
- **ci:** modernize template validation with pnpm ([78b1f98](https://github.com/aretw0/vault-seed/commit/78b1f98b0c0de8e3becfd65848d22eebdad90c91))
- **ci:** push full release branch history ([6239fa4](https://github.com/aretw0/vault-seed/commit/6239fa48bd97a3cfdcd3b4b8ffa2f51fb5d764b2))

### [0.2.9](https://github.com/aretw0/vault-seed/compare/v0.2.8...v0.2.9) (2026-01-27)

### 📚 Documentação

- add status badges to README ([35dcb30](https://github.com/aretw0/vault-seed/commit/35dcb30d1cea4e99474c9acccc3153424a98b9af))

### ✨ Novos Recursos

- Add Gemini AI commands and workflows for GitHub Actions. ([732f48d](https://github.com/aretw0/vault-seed/commit/732f48dbf0cdfdc3523eb6b1ee5e24f3a3e9f061))

### [0.2.8](https://github.com/aretw0/vault-seed/compare/v0.2.7...v0.2.8) (2026-01-05)

### 📚 Documentação

- **plugins:** update strategy with automation stack and opt-in philosophy ([678e03a](https://github.com/aretw0/vault-seed/commit/678e03a30cff82f2539a773d9c876d921107657e))

### ✨ Novos Recursos

- **docs:** add comprehensive dashboard guide ([e12c051](https://github.com/aretw0/vault-seed/commit/e12c0518f99993c8f9abd04d7763c173f89bae19))
- **templates:** add GTD daily note and refine dashboard template ([d922d23](https://github.com/aretw0/vault-seed/commit/d922d232e3516597068f250b297bfa55b60fc5d5))

### [0.2.7](https://github.com/aretw0/vault-seed/compare/v0.2.6...v0.2.7) (2025-12-12)

### 📚 Documentação

- Remove .env based secret management and update related documentation ([56cc4d0](https://github.com/aretw0/vault-seed/commit/56cc4d0536ace4d637c20c158ca40da276b985ce))

### [0.2.6](https://github.com/aretw0/vault-seed/compare/v0.2.5...v0.2.6) (2025-12-05)

### ✨ Novos Recursos

- adds license ([1d9d1b0](https://github.com/aretw0/vault-seed/commit/1d9d1b0f2d10a79c12b27a77924a7bb7100eb189))

### 🐛 Correções

- adjust condition on release workflow ([b22eee2](https://github.com/aretw0/vault-seed/commit/b22eee25c4c6e868aae459866ad6b96a645c3959))
- remove failing workflow ([f5e7f78](https://github.com/aretw0/vault-seed/commit/f5e7f78ef5b10721e3eb292379ee25fbcedd0823))
- **workflow:** adjust prepare release pr workflow ([e5532f2](https://github.com/aretw0/vault-seed/commit/e5532f2deff36468f72395e0e8fa24933ae15dd4))

### [0.2.5](https://github.com/aretw0/vault-seed/compare/v0.2.4...v0.2.5) (2025-11-20)

### 📚 Documentação

- **ai:** documenta o propósito do GEMINI.md para o usuário final ([3256864](https://github.com/aretw0/vault-seed/commit/32568641f506d1e945c192053088373373c4d6d1))
- **obsidian:** documenta a nova estratégia de gerenciamento de plugins ([4cc399d](https://github.com/aretw0/vault-seed/commit/4cc399d94c010068d8d23ef9cb7cef68a089972a))

### ✨ Novos Recursos

- **docs:** prioriza o plugin nativo 'Bases' sobre o 'Dataview' ([d1d018d](https://github.com/aretw0/vault-seed/commit/d1d018d3436dc8c51b19a024fcad29fcb5058178))
- **obsidian:** ignora o diretório de plugins da comunidade ([da61eeb](https://github.com/aretw0/vault-seed/commit/da61eebaed0a044315d27ed653048c6ffd1729f3))
- **project:** refatora o GEMINI.md para desenvolvimento do template ([625981e](https://github.com/aretw0/vault-seed/commit/625981eb2da147ccdbc8d9fdabdc20f63af352af))
- push release branch before creating PR ([2509d5d](https://github.com/aretw0/vault-seed/commit/2509d5d236ce24c5432cf173854e4a5f86763f8d))

### [0.2.4](https://github.com/aretw0/vault-seed/compare/v0.2.3...v0.2.4) (2025-10-15)

### 🐛 Correções

- **workflows:** Updates release workflow to fetch version from VERSION file. ([218c59a](https://github.com/aretw0/vault-seed/commit/218c59ab4ebd04bae4295500f4b1775cdb6e07d9))

### [0.2.3](https://github.com/aretw0/vault-seed/compare/v0.2.2...v0.2.3) (2025-10-15)

### 🐛 Correções

- **release:** Updates release scripts to skip tagging. ([3fd6585](https://github.com/aretw0/vault-seed/commit/3fd65854ac1ecfc2b5ba72d8c5cf4c1f83eca842))

### [0.2.2](https://github.com/aretw0/vault-seed/compare/v0.2.1...v0.2.2) (2025-10-15)

### 🐛 Correções

- Updates version retrieval in release workflows. ([5fe27dc](https://github.com/aretw0/vault-seed/commit/5fe27dc69e39292335aa04752e0945867f4b51e2))

### [0.2.1](https://github.com/aretw0/vault-seed/compare/v0.2.0...v0.2.1) (2025-10-14)

### 🐛 Correções

- Removes redundant push step in versioning workflow. ([8e9bc70](https://github.com/aretw0/vault-seed/commit/8e9bc70017f5f8809b947f3870377c1eebe088d8))
- Updates branch condition for versioning workflow. ([7c256c0](https://github.com/aretw0/vault-seed/commit/7c256c007c2d916286b577896d75095bf7dc4dbc))

### ♻️ Refatoração

- **release:** Alinha e automatiza o processo de release ([4f51f57](https://github.com/aretw0/vault-seed/commit/4f51f5728ea53aef84e63e435c807700f60d43d9))

### ✨ Novos Recursos

- Adds manual release process documentation. ([dc8aabc](https://github.com/aretw0/vault-seed/commit/dc8aabc6b4abe1e6ca4fd76905ed2e41588d14b8))
- adiciona feature flag para controlar workflows do Gemini ([#6](https://github.com/aretw0/vault-seed/issues/6)) ([9682f6b](https://github.com/aretw0/vault-seed/commit/9682f6b20c45a17e9e17141664a86e969c30cef0))
- **setup:** Feature/initial setup ([#4](https://github.com/aretw0/vault-seed/issues/4)) ([#5](https://github.com/aretw0/vault-seed/issues/5)) ([8baeb95](https://github.com/aretw0/vault-seed/commit/8baeb952082cf732632903cd33bb0e03a4afff07))
- Updates Obsidian configuration and restores daily notes. ([fa2c863](https://github.com/aretw0/vault-seed/commit/fa2c863e9693a65c777d15de66f9e41c147cd2d7))

### [0.2.1](https://github.com/aretw0/vault-seed/compare/v0.2.0...v0.2.1) (2025-10-14)

### 🐛 Correções

- Removes redundant push step in versioning workflow. ([8e9bc70](https://github.com/aretw0/vault-seed/commit/8e9bc70017f5f8809b947f3870377c1eebe088d8))
- Updates branch condition for versioning workflow. ([7c256c0](https://github.com/aretw0/vault-seed/commit/7c256c007c2d916286b577896d75095bf7dc4dbc))

### ♻️ Refatoração

- **release:** Alinha e automatiza o processo de release ([4f51f57](https://github.com/aretw0/vault-seed/commit/4f51f5728ea53aef84e63e435c807700f60d43d9))

### ✨ Novos Recursos

- Adds manual release process documentation. ([dc8aabc](https://github.com/aretw0/vault-seed/commit/dc8aabc6b4abe1e6ca4fd76905ed2e41588d14b8))
- adiciona feature flag para controlar workflows do Gemini ([#6](https://github.com/aretw0/vault-seed/issues/6)) ([9682f6b](https://github.com/aretw0/vault-seed/commit/9682f6b20c45a17e9e17141664a86e969c30cef0))
- **setup:** Feature/initial setup ([#4](https://github.com/aretw0/vault-seed/issues/4)) ([#5](https://github.com/aretw0/vault-seed/issues/5)) ([8baeb95](https://github.com/aretw0/vault-seed/commit/8baeb952082cf732632903cd33bb0e03a4afff07))
- Updates Obsidian configuration and restores daily notes. ([fa2c863](https://github.com/aretw0/vault-seed/commit/fa2c863e9693a65c777d15de66f9e41c147cd2d7))

## [0.2.0](https://github.com/aretw0/vault-seed/compare/v0.1.4...v0.2.0) (2025-09-11)

### ✨ Novos Recursos

- Implementa guarda de release e inclui refactor no changelog ([24b02a8](https://github.com/aretw0/vault-seed/commit/24b02a8ceac458e2f00b01e99d65e1de13057370))

### 📚 Documentação

- Adiciona documentação sobre limpeza de histórico Git ([0492c9a](https://github.com/aretw0/vault-seed/commit/0492c9a7dc7e334c317f62aae1b1ffeb0b2d3f3c))
- Adiciona documentação sobre o processo de release ([040d982](https://github.com/aretw0/vault-seed/commit/040d982cebde3b9583ab0ab953190c6408ea6c0c))

### ♻️ Refatoração

- Remove debug output from release workflow ([48ea20c](https://github.com/aretw0/vault-seed/commit/48ea20ccab519d8b8dacf14fc2c74f2e28679a4d))
- Remove prefix 'Release' from release name ([67948df](https://github.com/aretw0/vault-seed/commit/67948df2141b0b92c62ab321651d124a2b1c43c7))

### 🐛 Correções

- Ajusta lógica do guarda de release para verificar commits entre tags ([d3966e9](https://github.com/aretw0/vault-seed/commit/d3966e93e38f5e2b08228d9ca6870fbdf4fc4b4e))
- Corrige a lógica para obter a tag anterior limpa no guarda de release ([9267207](https://github.com/aretw0/vault-seed/commit/926720731f2d1e0e243dd562d08262f9de5ee672))
- Refina a lógica do guarda de release para obter a tag anterior corretamente ([7c9318a](https://github.com/aretw0/vault-seed/commit/7c9318a473322ceac3c3badda0aca5d3e8f6e5ee))

### [0.1.4](https://github.com/aretw0/vault-seed/compare/v0.1.3...v0.1.4) (2025-09-11)

### 🐛 Correções

- Melhora o nome da release no workflow ([0cbca4e](https://github.com/aretw0/vault-seed/commit/0cbca4e1574ec3981992d6c15a0a87eeef64d7c8))

### [0.1.3](https://github.com/aretw0/vault-seed/compare/v0.1.2...v0.1.3) (2025-09-11)

### ✨ Novos Recursos

- Adiciona permissão \`contents: write\` ao workflow de release ([f5f589e](https://github.com/aretw0/vault-seed/commit/f5f589e2aefbf35f7731b707f793a339e65a75bb))

### [0.1.2](https://github.com/aretw0/vault-seed/compare/v0.1.1...v0.1.2) (2025-09-10)

### 🐛 Correções

- **release:** Refactor release notes extraction to use Node.js script ([848182d](https://github.com/aretw0/vault-seed/commit/848182dd055aa5a78ad61b89c7a170899168c939))

### [0.1.1](https://github.com/aretw0/vault-seed/compare/v0.1.0...v0.1.1) (2025-09-10)

### 📚 Documentação

- aprimora a documentação do processo de release ([25a7fc1](https://github.com/aretw0/vault-seed/commit/25a7fc1d66a53aaf893667282d9593362d7271c9))

### 🐛 Correções

- **release:** isola o versionamento no arquivo VERSION e robustece o workflow ([756b2c9](https://github.com/aretw0/vault-seed/commit/756b2c991a3f146302648704462e3fc939cb8fe9))

## [0.1.0](https://github.com/aretw0/vault-seed/compare/v0.0.2...v0.1.0) (2025-09-10)

### 📚 Documentação

- Add digital gardener's perspective on versioning ([63071ea](https://github.com/aretw0/vault-seed/commit/63071eaf9bea646862029d582c2c48904d8730d4))
- Document release automation strategy and workflow ([0b67184](https://github.com/aretw0/vault-seed/commit/0b67184aa655976dc90dadb107af6544dd2dc293))
- Document versioning and release strategy ([fa56f4b](https://github.com/aretw0/vault-seed/commit/fa56f4b4ce978ee57ab22b9f5b89bb3d82b5c48b))
- Refine versioning strategy examples for template context ([6a5737d](https://github.com/aretw0/vault-seed/commit/6a5737d26d6579b2806397a5eadb8ebb2383f5d6))

### ✨ Novos Recursos

- Add minor and major release scripts to package.json ([12dc089](https://github.com/aretw0/vault-seed/commit/12dc08994aae1343c40a299f48e39a426b1db86a))
- Enable Markdown linting in CI workflow ([bf645d0](https://github.com/aretw0/vault-seed/commit/bf645d033de493105eebc1674bfcbbd5b4dfb439))
- Flexibiliza regras de lint e documenta o processo ([0fdb69a](https://github.com/aretw0/vault-seed/commit/0fdb69ac54b09616a66aa356af2be8845b2d46eb))
- **lint:** implementa lint gradual e documenta o processo ([e036183](https://github.com/aretw0/vault-seed/commit/e03618361cffa844cde52dc81a1cd4302912f90c))
- **workflow:** Add dormant GitHub Release automation workflow ([a8bb01d](https://github.com/aretw0/vault-seed/commit/a8bb01d02b396517b7b3a4c83976702976d57d48))
- **workflow:** Implement dynamic release workflow activation/deactivation ([696e50b](https://github.com/aretw0/vault-seed/commit/696e50baa206c2cbfba5f37ae6898df47e48800c))

### 0.0.2 (2025-09-09)

### 🐛 Correções

- Ajusta execução do script setup_node.sh ([b7daa18](https://github.com/aretw0/vault-seed/commit/b7daa1805c2887f4dae94ef7a599d29be4b37a10))
- Update project description to include Visual Studio Code (Foam) support ([bc19e97](https://github.com/aretw0/vault-seed/commit/bc19e971eda63567b3a7cc099eb4988d909f60e4))

### ✨ Novos Recursos

- ✨ Automatiza a inicialização do vault para novos usuários ([a870b50](https://github.com/aretw0/vault-seed/commit/a870b50dcc4501f7c87ba8a658ab9de3290b70d9))
- Add initial configuration files for Obsidian vault ([334e0e8](https://github.com/aretw0/vault-seed/commit/334e0e84e8bdc629420834aacff485145a77ac05))
- Adiciona .vscode/extensions.json e ajusta .gitignore ([a2c8faf](https://github.com/aretw0/vault-seed/commit/a2c8faf5af7e3abb36a30cb437931b987a831188))
- Adiciona arquivos de template e inicializa pasta Inbox ([3ac85cc](https://github.com/aretw0/vault-seed/commit/3ac85ccb50343c4b56c60081be315d1b10e8a737))
- adiciona bumpFiles ([b7fbd45](https://github.com/aretw0/vault-seed/commit/b7fbd456b3e757b51aef8ab533829706743a0bf3))
- adiciona estrutura de conventional commits ([9802a7a](https://github.com/aretw0/vault-seed/commit/9802a7a50eb70694dfdcdbd28ba6164b9c5c0537))
- Adiciona script para remover arquivo do histórico do Git ([d74ce64](https://github.com/aretw0/vault-seed/commit/d74ce64cfd2df922ae7b3977a889a4c8f0bcb46c))
- **build:** adiciona VERSION e package-lock.json ([7aa16f5](https://github.com/aretw0/vault-seed/commit/7aa16f53e9577a521c6fadb455c19308b4fe3e92))
- **ci:** Restructure CI/CD for template and user workflows ([4a0179f](https://github.com/aretw0/vault-seed/commit/4a0179fed2e03a530e7d052337c0d435d12b1d75))
- **config:** ignora arquivos de configuração de plugins sensíveis ([2cf9cf8](https://github.com/aretw0/vault-seed/commit/2cf9cf8f1efa0e15d6431f9ee0587a3f2583eec1))
- **copilot:** Refactor Copilot setup and .gitignore ([307738b](https://github.com/aretw0/vault-seed/commit/307738b40ed7d78f386d99268b5851b0c6ec12f8))
- **dev-config:** adiciona configurações de versionamento e commit ([82a6018](https://github.com/aretw0/vault-seed/commit/82a60184c93dcf2031905382a83ea9c425c345df))
- **dev-tools:** adiciona package.json com ferramentas de desenvolvimento ([33453e1](https://github.com/aretw0/vault-seed/commit/33453e1767c274bc3f3803fd7f2c7fc7a3b2cdbf))
- Improve setup scripts and environment compatibility ([1e50cfb](https://github.com/aretw0/vault-seed/commit/1e50cfb716cade7ee7cd4c61fec69dc7ef578181))
- Revamp vault structure and documentation ([03427c5](https://github.com/aretw0/vault-seed/commit/03427c517c143daa8dafc360004d83400e344ff0))
- **security:** implementa sistema de gerenciamento de segredos com Git filter ([6188836](https://github.com/aretw0/vault-seed/commit/618883645c6ea09eac333cd90587034c86bc9c3f))
- **template:** add initialization script and update README ([a86f4b1](https://github.com/aretw0/vault-seed/commit/a86f4b1b44949bda95629d9e17ce49da419bd0af))
- **workflow:** Enhance vault initialization with template files and cleaner docs setup ([5ce4b0e](https://github.com/aretw0/vault-seed/commit/5ce4b0ef1725a6c3ffc544c3b77592f9b30c7aa4))

### 📚 Documentação

- 🏗️ Adiciona documentação técnica da organização do projeto ([38c4778](https://github.com/aretw0/vault-seed/commit/38c4778fd8ea923641a8b2952aa82803bbe3ff34))
- 📚 Esclarece a distinção entre docs/ e 99-Meta & Attachments/ ([6082594](https://github.com/aretw0/vault-seed/commit/6082594f998521ef24579732f03e90ce80c15647))
- 📝 Documenta a automação da inicialização do vault ([fdd9e6a](https://github.com/aretw0/vault-seed/commit/fdd9e6a6d80554ad136f0652561288c3cd2b6ecf))
- Add GCM configuration for WSL users and update script ([0c5f14e](https://github.com/aretw0/vault-seed/commit/0c5f14e94ef19a7025fc19966f542030bb2dfd79))
- Refine original README.md for template clarity ([8665137](https://github.com/aretw0/vault-seed/commit/86651376c7f1f8fc98dc8d48db3ff45dc1044611))
- **security:** adiciona documentação sobre gestão de segredos no Git ([8ce9a42](https://github.com/aretw0/vault-seed/commit/8ce9a42afd3137ee6cebaff27e3d8d486c36c427))

### 0.0.1 (2025-09-09)

### 🐛 Correções

- Ajusta execução do script setup_node.sh ([b7daa18](https://github.com/aretw0/vault-seed/commit/b7daa1805c2887f4dae94ef7a599d29be4b37a10))
- Update project description to include Visual Studio Code (Foam) support ([bc19e97](https://github.com/aretw0/vault-seed/commit/bc19e971eda63567b3a7cc099eb4988d909f60e4))

### 📚 Documentação

- Add GCM configuration for WSL users and update script ([0c5f14e](https://github.com/aretw0/vault-seed/commit/0c5f14e94ef19a7025fc19966f542030bb2dfd79))
- **security:** adiciona documentação sobre gestão de segredos no Git ([8ce9a42](https://github.com/aretw0/vault-seed/commit/8ce9a42afd3137ee6cebaff27e3d8d486c36c427))

### ✨ Novos Recursos

- Add initial configuration files for Obsidian vault ([334e0e8](https://github.com/aretw0/vault-seed/commit/334e0e84e8bdc629420834aacff485145a77ac05))
- Adiciona .vscode/extensions.json e ajusta .gitignore ([a2c8faf](https://github.com/aretw0/vault-seed/commit/a2c8faf5af7e3abb36a30cb437931b987a831188))
- Adiciona arquivos de template e inicializa pasta Inbox ([3ac85cc](https://github.com/aretw0/vault-seed/commit/3ac85ccb50343c4b56c60081be315d1b10e8a737))
- adiciona bumpFiles ([b7fbd45](https://github.com/aretw0/vault-seed/commit/b7fbd456b3e757b51aef8ab533829706743a0bf3))
- adiciona estrutura de conventional commits ([9802a7a](https://github.com/aretw0/vault-seed/commit/9802a7a50eb70694dfdcdbd28ba6164b9c5c0537))
- Adiciona script para remover arquivo do histórico do Git ([d74ce64](https://github.com/aretw0/vault-seed/commit/d74ce64cfd2df922ae7b3977a889a4c8f0bcb46c))
- **build:** adiciona VERSION e package-lock.json ([7aa16f5](https://github.com/aretw0/vault-seed/commit/7aa16f53e9577a521c6fadb455c19308b4fe3e92))
- **config:** ignora arquivos de configuração de plugins sensíveis ([2cf9cf8](https://github.com/aretw0/vault-seed/commit/2cf9cf8f1efa0e15d6431f9ee0587a3f2583eec1))
- **dev-config:** adiciona configurações de versionamento e commit ([82a6018](https://github.com/aretw0/vault-seed/commit/82a60184c93dcf2031905382a83ea9c425c345df))
- **dev-tools:** adiciona package.json com ferramentas de desenvolvimento ([33453e1](https://github.com/aretw0/vault-seed/commit/33453e1767c274bc3f3803fd7f2c7fc7a3b2cdbf))
- Improve setup scripts and environment compatibility ([1e50cfb](https://github.com/aretw0/vault-seed/commit/1e50cfb716cade7ee7cd4c61fec69dc7ef578181))
- Revamp vault structure and documentation ([03427c5](https://github.com/aretw0/vault-seed/commit/03427c517c143daa8dafc360004d83400e344ff0))
- **security:** implementa sistema de gerenciamento de segredos com Git filter ([6188836](https://github.com/aretw0/vault-seed/commit/618883645c6ea09eac333cd90587034c86bc9c3f))

# @aretw0/dgk-runner

## 0.1.0

### Minor Changes

- 5b0c42c: dgk v0.4: credential manager, pnpm-free UX, and cleaner command surface.

  **`dgk sow`** — interactive credential wizard for Telegram (sow → etl → outbox cycle complete). Stores tokens at `~/.dgk/silo.json` with `0o600` permissions. Verifies credentials against the real API before saving. `dgk sow list` masks stored values for safe display. Mastodon, Bluesky, and Buttondown support is ready internally but will be exposed when `dgk outbox` is implemented for each channel.

  **`dgk open <notebook|obsidian>`** — top-level command replacing `dgk lab open` and `dgk lab open-vault`. `dgk open obsidian` opens the vault in Obsidian via URI scheme. `dgk open <name>` opens a marimo notebook by short name or partial match.

  **`dgk note <cmd>`** — top-level Obsidian CLI passthrough, replacing `dgk lab note`.

  **`dgk lab`** is now exclusively pipeline: `etl`, `curate`, `evaluate`, `export`. Navigation commands moved up to reduce nesting.

  **pnpm-free user workflow** — `dgk check` calls scripts via `node` directly; `dgk lint` uses `node_modules/markdownlint-cli/markdownlint.js` directly. Users never need to know pnpm exists.

  **`dgk setup` cross-platform** — rewritten in pure JavaScript. No `bash` dependency. Uses `execFileSync('git', ...)` for git config, checks PATH for `git-filter-repo` directly instead of relying on `uv tool list`. Works on Windows without Git Bash or WSL.

  **CLI bin wired** — `@aretw0/dgk-cli` is now declared as a devDependency in the vault root (`workspace:*` in dev, `latest` in user vaults). After `pnpm install`, `node_modules/.bin/dgk` is available. On Windows use `dgk.CMD`; `dgk setup` will install a PATH shim in a future release.

- ee10fdf: Add extension bridge: Pi skills package and dgk publish scaffold command.

  **`@aretw0/dgk-skills`** — new Pi-compatible skills package (`pi install npm:@aretw0/dgk-skills`) with five declarative vault skills: `vault-context`, `vault-search`, `vault-read`, `vault-create`, `vault-daily`. Skills are Markdown-only (engine-agnostic) and teach agents how to interact with a dgk vault via the Obsidian CLI.

  **`dgk publish skill <name>`** — scaffolds a new Pi skill package under `packages/<name>/` with `SKILL.md` template, `package.json` with `"pi": { "skills": [...] }`, and a pinned GitHub Actions publish workflow (`.github/workflows/publish-<name>.yml`). Tag `<package>@<version>` to trigger npm publish via CI.

  **`dgk publish extension <name>`** — same scaffold for TypeScript Pi extensions with `src/index.ts` boilerplate calling `pi.registerTool()`.

  Users can now publish their own skills from curated vault content without touching the vault-seed CI pipeline.

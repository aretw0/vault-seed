---
"@aretw0/dgk-cli": minor
"@aretw0/dgk-runner": minor
---

dgk v0.4: credential manager, pnpm-free UX, and cleaner command surface.

**`dgk sow`** — interactive credential wizard for Mastodon, Bluesky, and Buttondown. Stores tokens at `~/.dgk/silo.json` with `0o600` permissions. Verifies each credential against the real API before saving. `dgk sow list` masks stored values for safe display.

**`dgk open <notebook|obsidian>`** — top-level command replacing `dgk lab open` and `dgk lab open-vault`. `dgk open obsidian` opens the vault in Obsidian via URI scheme. `dgk open <name>` opens a marimo notebook by short name or partial match.

**`dgk note <cmd>`** — top-level Obsidian CLI passthrough, replacing `dgk lab note`.

**`dgk lab`** is now exclusively pipeline: `etl`, `curate`, `evaluate`, `export`. Navigation commands moved up to reduce nesting.

**pnpm-free user workflow** — `dgk check` calls scripts via `node` directly; `dgk lint` uses `node_modules/markdownlint-cli/markdownlint.js` directly. Users never need to know pnpm exists.

**`dgk setup` cross-platform** — rewritten in pure JavaScript. No `bash` dependency. Uses `execFileSync('git', ...)` for git config, checks PATH for `git-filter-repo` directly instead of relying on `uv tool list`. Works on Windows without Git Bash or WSL.

**CLI bin wired** — `@aretw0/dgk-cli` is now declared as a devDependency in the vault root (`workspace:*` in dev, `latest` in user vaults). After `pnpm install`, `node_modules/.bin/dgk` is available. On Windows use `dgk.CMD`; `dgk setup` will install a PATH shim in a future release.

# @aretw0/dgk-skills

## 0.1.0

### Minor Changes

- ee10fdf: Add extension bridge: Pi skills package and dgk publish scaffold command.

  **`@aretw0/dgk-skills`** — new Pi-compatible skills package (`pi install npm:@aretw0/dgk-skills`) with five declarative vault skills: `vault-context`, `vault-search`, `vault-read`, `vault-create`, `vault-daily`. Skills are Markdown-only (engine-agnostic) and teach agents how to interact with a dgk vault via the Obsidian CLI.

  **`dgk publish skill <name>`** — scaffolds a new Pi skill package under `packages/<name>/` with `SKILL.md` template, `package.json` with `"pi": { "skills": [...] }`, and a pinned GitHub Actions publish workflow (`.github/workflows/publish-<name>.yml`). Tag `<package>@<version>` to trigger npm publish via CI.

  **`dgk publish extension <name>`** — same scaffold for TypeScript Pi extensions with `src/index.ts` boilerplate calling `pi.registerTool()`.

  Users can now publish their own skills from curated vault content without touching the vault-seed CI pipeline.

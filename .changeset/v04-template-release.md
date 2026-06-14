---
"digital-gardening-kit": minor
---

v0.4: vault initialization automation, lab notebook fixes, and CI hardening.

**`initialize.yml`** — automatically protects the `main` branch against force-pushes and deletions, and enables GitHub Pages, on the user's first push. Closes #55 and #56.

**Lab notebooks** — fix `SyntaxError: '(' was never closed` when exporting notebooks whose `marimo.App()` constructor spans multiple lines. Runtime helper injection now tracks parenthesis depth to find the actual closing `)`. Regression tests added covering single-line, multi-line, and nested-paren App() variants.

**CI** — `test:python` removed from the `validate` script and exclusively handled by the dedicated `test-python` job which installs `uv`. Fixes `uv: not found` failures in the validate runner.

**`dgk` CLI** — fix `vaultNameFromCwd` returning the full Windows path when running on Linux CI (`path.basename` treats `\` as a literal character on POSIX, not a separator).

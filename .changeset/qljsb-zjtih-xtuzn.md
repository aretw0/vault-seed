---
"digital-gardening-kit": patch
---

Fix invisible and broken content in published notebooks, clarify attachment folder documentation, and resolve Astro 6 deprecation warning.

**Notebooks — WASM runtime fix:** Lab notebooks were throwing a NameError popup in the browser. Root cause: `_lab_notebook_runtime.py` contains `from dgk_lab_runtime import *`, and marimo's AST parser converts any cell with a wildcard import to `app._unparsable_cell(...)`, which is never executed in the WASM runtime. Fixed by extracting only the inline fallback function definitions (the `except ImportError:` block body) before injecting them into the exported cell — no wildcard import, no unparsable cell.

**Notebooks — cell output fix:** In marimo, only the last evaluated expression in a cell body is shown as visual output. All "Lane de entendimento" sections had 5 consecutive `mo.md()` calls — only the last was visible. Section headings preceding `mo.ui.table()` / `mo.ui.altair_chart()` were also silently discarded. Fixed by combining sequential `mo.md()` calls into a single call and wrapping heading+table pairs with `mo.vstack()`. Also fixes a broken f-string in the `analise-publicacao.py` header cell and a hidden checkbox widget in `etl-demo.py`. Regression tests added (`notebook_cell_output_lint.test.mjs`, `notebook_export_runtime_helpers.test.mjs`).

**Docs:** Corrected `Attachments/` → `Anexos/` naming in `organizacao-do-projeto.md`, `Entendendo a Estrutura de Pastas.md`, and `README.md`. Clarified that `99 - Meta e Anexos/Anexos/` is the global attachment sink configured for the entire vault.

**Astro:** Migrated `markdown.remarkPlugins` to `markdown.processor: unified({...})` from `@astrojs/markdown-remark` to silence the Astro 6 deprecation warning.

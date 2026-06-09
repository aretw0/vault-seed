---
"digital-gardening-kit": patch
---

Fix invisible content in published notebooks and clarify attachment folder documentation.

**Notebooks:** In marimo, only the last evaluated expression in a cell body is shown as visual output. All "Lane de entendimento" sections had 5 consecutive `mo.md()` calls — only the last was visible. Section headings preceding `mo.ui.table()` / `mo.ui.altair_chart()` were also silently discarded. Fixed by combining sequential `mo.md()` calls into a single call and wrapping heading+table pairs with `mo.vstack()`. Also fixes a broken f-string in the `analise-publicacao.py` header cell and a hidden checkbox widget in `etl-demo.py`. A regression test (`notebook_cell_output_lint.test.mjs`) is added to prevent recurrence.

**Docs:** Corrected `Attachments/` → `Anexos/` naming in `organizacao-do-projeto.md`, `Entendendo a Estrutura de Pastas.md`, and `README.md`. Clarified that `99 - Meta e Anexos/Anexos/` is the global attachment sink configured for the entire vault, and that `99 - Meta e Anexos/` is for onboarding guides rather than user knowledge content.

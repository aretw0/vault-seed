---
"digital-gardening-kit": patch
---

Fix Lab notebook accessibility in dark mode: single-series chart bars now use a
color that clears WCAG non-text contrast on both the light and dark backgrounds
(the previous dark green vanished on the dark theme), and the notebook shell keeps
a single scroll with the topbar and the "feito com amor" footer pinned to the
viewport instead of drifting with the content. Adds a contrast contract that
guards chart mark colors against regressions.

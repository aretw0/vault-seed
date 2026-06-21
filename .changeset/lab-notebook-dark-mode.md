---
"digital-gardening-kit": patch
---

Fix Lab notebook accessibility in dark mode. Chart text and axes are no longer
forced to a light-theme color that disappeared over Marimo's dark chart canvas —
the Altair helper lets Marimo theme text/axes/grid for the active mode, and the
exported notebooks also inject the vault palette into the chart shadow DOM so the
text tracks the theme. Single-series bars use a color that clears WCAG non-text
contrast on both backgrounds. The notebook shell keeps a single scroll with the
topbar and the "feito com amor" footer pinned to the viewport instead of drifting
with the content. Adds a contrast contract that guards chart mark colors.

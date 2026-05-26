---
mode: agent
---
Transforme o item de feed ou snapshot no contexto em uma nota candidata para `00 - Entrada/`.

Regras:

1. Não invente fatos que não estejam no item original.
2. Preserve a proveniência no frontmatter:
   - `source`
   - `collectedAt`
   - `sha256`
   - `license`
   - `privacy`
3. Use `status: draft`, `category: fonte` e tag `fonte/feed`.
4. Inclua uma seção `## Evidências` com URL, título original e data quando existirem.
5. Inclua uma seção `## Decisão` com checkboxes para manter, transformar, conectar ou descartar.
6. Sugira wikilinks, mas diferencie claramente sugestão de fato.
7. Não publique a nota automaticamente. Deixe em `00 - Entrada/` para revisão humana.

Formato esperado: Markdown completo de uma nota Obsidian.

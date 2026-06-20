# @aretw0/dgk-astro-plugins

Plugins [remark](https://github.com/remarkjs/remark) que renderizam a sintaxe
do Obsidian/Foam no site Astro do Digital Gardening Kit. Convertem a marcação
de um vault PARA em HTML coerente com o tema do site.

## O que inclui

| Export             | Função                                                                               |
| ------------------ | ------------------------------------------------------------------------------------ |
| `remarkCallouts`   | Converte callouts do Obsidian (`> [!note]`, `> [!warning]`, …) em blocos estilizados |
| `remarkWikiLinks`  | Resolve wiki links `[[Nota]]` e `[[Nota\|alias]]` para links do site                 |
| `remarkWikiImages` | Resolve embeds de imagem `![[arquivo.png]]`                                          |
| `slugify`          | Gera slugs estáveis a partir de títulos (compartilhado entre links e âncoras)        |

## Instalação

```bash
pnpm add -D @aretw0/dgk-astro-plugins
```

## Uso

```js
// astro.config.mjs
import {
  remarkCallouts,
  remarkWikiLinks,
  remarkWikiImages,
} from "@aretw0/dgk-astro-plugins";

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkWikiLinks, remarkWikiImages, remarkCallouts],
  },
});
```

O pacote é publicado a partir de `dist/` (compilado de TypeScript); rode o
build do workspace (`pnpm --filter @aretw0/dgk-astro-plugins build`) antes de
publicar.

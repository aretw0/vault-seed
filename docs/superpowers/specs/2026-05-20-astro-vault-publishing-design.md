# Publicação do Vault com Astro + Starlight

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Astro 6 + Starlight ao vault-seed para que o usuário possa publicar notas selecionadas como site estático no GitHub Pages, com wikilinks resolvidos respeitando a visibilidade pública/privada de cada nota, e preview local via devcontainer.

**Architecture:** Astro 6 com `srcDir: '.site'` lê diretamente das pastas do vault via Content Layer (glob loader). Plugins remark para wikilinks, image embeds e callouts são extraídos para `@dgk/astro-plugins` (novo pacote no monorepo). O gating público/privado usa o campo `status: published` já presente nos frontmatters do vault. Starlight (tema oficial do Astro) fornece navegação, busca e dark mode sem configuração extra.

**Tech Stack:** Astro 6.3+, `@astrojs/starlight`, `@dgk/astro-plugins` (remark puro), pnpm workspaces, GitHub Actions, Pagefind (busca, bundled com Starlight)

**Nota de versão:** O `astro-vault` (referência de código) usa Astro 5.17. Na implementação, instalar a versão mais recente do Astro 6.x (`pnpm add astro@^6`) — atualmente 6.3+. Verificar breaking changes em `https://docs.astro.build/en/guides/upgrade-to/v6/` antes de adaptar os plugins e o Content Layer. Dependabot mantém a versão atualizada dentro do range `^6`.

---

## Pré-requisito

Este spec deve ser implementado **após** o rename PT-BR (`2026-05-19-renomear-pastas-pt-br-e-migrar-changesets.md`). Todos os paths usam os nomes novos (`00 - Entrada`, `10 - Diário`, etc.).

---

## Estrutura de arquivos

```
repo root/
├── astro.config.mjs                        ← config Astro (vai para o usuário)
├── .site/
│   ├── content/
│   │   └── config.ts                       ← Content Layer: glob das pastas PT-BR
│   ├── pages/
│   │   └── [...slug].astro                 ← rota dinâmica para notas publicadas
│   ├── layouts/
│   │   └── NoteLayout.astro                ← wrapper Starlight para notas do vault
│   └── styles/
│       └── custom.css                      ← overrides CSS do Starlight
├── packages/
│   ├── cli/                                ← @dgk/cli (existente)
│   └── astro-plugins/                      ← @dgk/astro-plugins (novo)
│       ├── src/
│       │   ├── remark-wiki-links.ts        ← wikilinks + gating público/privado
│       │   ├── remark-wiki-images.ts       ← ![[img.png]] → <img lazy>
│       │   └── remark-callouts.ts          ← > [!NOTE] → callout HTML
│       ├── index.ts                        ← exports dos três plugins
│       └── package.json
├── .github/workflows/
│   └── deploy-site.yml                     ← build Astro + deploy GitHub Pages
└── package.template.json                   ← inclui @dgk/astro-plugins como devDep
```

---

## Pacote `@dgk/astro-plugins`

### Responsabilidade

Três plugins remark independentes, sem acoplamento à versão do Astro. O código-base é adaptado de `aretw0/astro-vault` (v0.4.2), que já tem os três plugins funcionando.

### `remark-wiki-links.ts`

Recebe no construtor um `Set<string>` de slugs publicados (`publishedSlugs`). Para cada nó `[[Title]]` encontrado na AST:

- Se `slug(Title)` está em `publishedSlugs` → transforma em `<a href="/base/slug">Title</a>`
- Se não está (nota privada ou inexistente) → transforma em texto simples (remove o link, mantém o texto)

O `publishedSlugs` é construído durante o build do Astro antes do processamento do conteúdo — ver seção Content Layer.

### `remark-wiki-images.ts`

Converte `![[image.png]]` em `<img src="/assets/image.png" loading="lazy" alt="image">`. Apenas imagens que existem em `99 - Meta e Anexos/Attachments/` (mapeado para `public/assets/` durante o build) são incluídas.

### `remark-callouts.ts`

Converte a sintaxe Obsidian de callouts (`> [!NOTE]`, `> [!WARNING]`, etc.) em blocos HTML com classes CSS correspondentes. Compatível com a sintaxe do Starlight.

### `package.json` do pacote

```json
{
  "name": "@dgk/astro-plugins",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^3.0.0",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0"
  },
  "peerDependencies": {
    "unified": "^11.0.0"
  }
}
```

---

## Content Layer — `config.ts`

```ts
// .site/content/config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

const notes = defineCollection({
  loader: glob({
    pattern: VAULT_FOLDERS.map(f => `${f}/**/*.md`),
    base: './',
  }),
  schema: z.object({
    title: z.string().optional(),
    status: z.enum(['published', 'draft']).optional(),
    tags: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  }).transform(data => ({
    ...data,
    isPublished: data.status === 'published',
  })),
});

export const collections = { notes };
```

O slug de cada nota é derivado do `id` gerado pelo glob loader (path relativo ao base, sem extensão). Exemplo: `40 - Recursos/O que é PARA.md` → id `40 - Recursos/O que é PARA` → slug normalizado `recursos/o-que-e-para`.

### Construção do `publishedSlugs`

O `Set<string>` de slugs publicados é construído **uma única vez**, em `astro.config.mjs`, pela integração `collect-published-slugs.ts`. Essa integração lê os `.md` das pastas do vault diretamente (sem passar pelo Content Layer) para ter os slugs disponíveis antes do processamento de conteúdo. O `Set` é passado ao `remarkWikiLinks` na configuração markdown — não há construção duplicada em `[...slug].astro`.

---

## `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { remarkWikiLinks, remarkWikiImages, remarkCallouts } from '@dgk/astro-plugins';

// publishedSlugs é populado em build-time via integração customizada
// ver .site/integrations/collect-published-slugs.ts
import { collectPublishedSlugs } from './.site/integrations/collect-published-slugs.ts';

const publishedSlugs = await collectPublishedSlugs();

export default defineConfig({
  srcDir: '.site',
  site: 'https://{{REPO_OWNER}}.github.io',
  base: '/{{REPO_NAME}}',
  markdown: {
    remarkPlugins: [
      remarkCallouts,
      remarkWikiImages,
      [remarkWikiLinks, { publishedSlugs, base: '/{{REPO_NAME}}' }],
    ],
  },
  integrations: [
    starlight({
      title: 'Meu Vault',
      defaultLocale: 'pt-BR',
      social: { github: 'https://github.com/{{REPO_NAME}}' },
      sidebar: [
        { label: 'Recursos',  autogenerate: { directory: 'recursos' } },
        { label: 'Projetos',  autogenerate: { directory: 'projetos' } },
        { label: 'Áreas',     autogenerate: { directory: 'areas' } },
      ],
      customCss: ['./.site/styles/custom.css'],
    }),
  ],
});
```

`{{REPO_OWNER}}` e `{{REPO_NAME}}` são substituídos pelo `initialize.yml` (mesmo padrão do `package.template.json`).

### Integração `collect-published-slugs.ts`

Uma Astro integration leve que lê os `.md` das pastas do vault, filtra `status: published` e retorna o `Set<string>` de slugs. Roda antes do build de conteúdo para que o plugin de wikilinks tenha os dados disponíveis.

---

## CI — `deploy-site.yml`

Trigger: push para `main` com mudanças em pastas do vault, `.site/**`, `astro.config.mjs`, ou `packages/astro-plugins/**`. Também `workflow_dispatch`.

```yaml
name: Deploy Site

on:
  push:
    branches: [main]
    paths:
      - "00 - Entrada/**"
      - "10 - Diário/**"
      - "20 - Projetos/**"
      - "30 - Áreas/**"
      - "40 - Recursos/**"
      - "50 - Arquivo/**"
      - "90 - Modelos/**"
      - "99 - Meta e Anexos/**"
      - ".site/**"
      - "astro.config.mjs"
      - "packages/astro-plugins/**"
      - ".github/workflows/deploy-site.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: ./.github/actions/setup
      - name: Build astro-plugins
        run: pnpm --filter @dgk/astro-plugins build
      - name: Build site
        run: pnpm run site:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Nota: `actions/upload-pages-artifact` e `actions/deploy-pages` — verificar hashes atuais antes de implementar em `https://github.com/actions/upload-pages-artifact/releases` e `https://github.com/actions/deploy-pages/releases`.

---

## Devcontainer

Nenhuma mudança no `devcontainer.json` — Node 22 + pnpm já estão presentes.

Adicionar scripts em `package.json` (template-dev) e `package.template.json` (usuário):

```json
"site:dev":   "astro dev",
"site:build": "pnpm --filter @dgk/astro-plugins build && astro build"
```

`pnpm run site:dev` no devcontainer expõe automaticamente `localhost:4321` via port forwarding do VS Code.

---

## Fronteira do template (`initialize.yml`)

### O usuário **herda** (não removido)
- `astro.config.mjs` — com `{{REPO_OWNER}}` e `{{REPO_NAME}}` substituídos
- `.site/` — layouts, content config, styles, integrations
- `.github/workflows/deploy-site.yml`
- `@dgk/astro-plugins` como dep em `package.template.json`

### Template-dev **apenas** (adicionado a `files_to_remove`)
- `packages/astro-plugins` — código-fonte dos plugins

### Atualizações necessárias no `initialize.yml`
1. Adicionar `packages/astro-plugins` à lista `files_to_remove`
2. Adicionar substituição de `{{REPO_OWNER}}` e `{{REPO_NAME}}` no `astro.config.mjs` (além do `package.template.json` que já tem)

### `publish-cli.yml` — estender para publicar `@dgk/astro-plugins`
O workflow existente publica `@dgk/cli`. Adicionar `pnpm --filter @dgk/astro-plugins publish` no mesmo job para que os dois pacotes sejam publicados juntos a cada release.

---

## Notas dos guias já prontas para publicação

As notas da pasta `99 - Meta e Anexos/` dos guias do vault já têm `status: published` no frontmatter. No primeiro deploy após a inicialização, o site já mostra esses guias — sem edição manual necessária.

---

## O que não está no escopo

- **Marimo** — spec separado (`2026-05-20-marimo-notebooks-design.md`)
- Graph view / backlinks interativos — pode ser adicionado depois via plugin Starlight da comunidade
- Comentários, analytics, formulários
- Suporte a múltiplos idiomas no conteúdo
- Paginação ou índice automático de todas as notas
- Exportação de imagens do Obsidian para `public/assets/` — o plugin `remark-wiki-images` assume que as imagens já estão em `99 - Meta e Anexos/Attachments/`; a cópia para `public/` é manual ou via script separado

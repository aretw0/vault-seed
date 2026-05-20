# Publicação do Vault com Astro + Starlight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Astro 6.3+ + Starlight ao vault-seed, publicando notas com `status: published` como site estático no GitHub Pages, com wikilinks que respeitam visibilidade pública/privada.

**Architecture:** `@dgk/astro-plugins` (novo pacote TypeScript no monorepo) fornece três plugins remark portados de `aretw0/astro-vault`: wikilinks com gating público/privado, image embeds e callouts. Astro lê as pastas do vault via vault loader customizado no Content Layer (filtra `status: published` na fonte). Starlight provê tema, navegação e busca. Deploy via GitHub Actions com env vars (sem substituição de template).

**Tech Stack:** Astro 6.3+, `@astrojs/starlight`, `@dgk/astro-plugins` (TypeScript, remark puro), `gray-matter`, `glob`, pnpm workspaces, GitHub Actions

---

## Pré-requisitos

1. Plano PT-BR rename implementado — pastas com nomes novos (`00 - Entrada`, etc.)
2. `pnpm-workspace.yaml` já inclui `"."` e `"packages/*"` (feito no rename spec)

Verificar:
```bash
ls "00 - Entrada/" "40 - Recursos/" "99 - Meta e Anexos/"
# Expected: pastas PT-BR existem

grep '"."' pnpm-workspace.yaml
# Expected: linha com "."
```

## Referência de código

Os plugins `remark-callouts.js` e `remark-wiki-image-embeds.js` do repo `aretw0/astro-vault` são a base para os ports TypeScript. Antes de implementar as Tasks 3-4, ler esses arquivos:

```bash
cat ~/Documents/GitHub/astro-vault/src/plugins/remark-callouts.js
cat ~/Documents/GitHub/astro-vault/src/plugins/remark-wiki-image-embeds.js
```

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `packages/astro-plugins/package.json` | Criar |
| `packages/astro-plugins/tsconfig.json` | Criar |
| `packages/astro-plugins/vitest.config.ts` | Criar |
| `packages/astro-plugins/src/slugify.ts` | Criar |
| `packages/astro-plugins/src/remark-wiki-links.ts` | Criar |
| `packages/astro-plugins/src/remark-wiki-images.ts` | Criar (port JS→TS) |
| `packages/astro-plugins/src/remark-callouts.ts` | Criar (port JS→TS) |
| `packages/astro-plugins/src/index.ts` | Criar |
| `packages/astro-plugins/src/__tests__/*.test.ts` | Criar |
| `astro.config.mjs` | Criar |
| `.site/content/config.ts` | Criar |
| `.site/integrations/collect-published-slugs.ts` | Criar |
| `.site/styles/custom.css` | Criar |
| `package.json` | Modificar (deps + scripts) |
| `package.template.json` | Modificar (deps + scripts) |
| `.github/workflows/deploy-site.yml` | Criar |
| `.github/workflows/publish-cli.yml` | Modificar (adicionar trigger para astro-plugins) |

---

### Task 1: Scaffold `packages/astro-plugins`

**Files:**
- Create: `packages/astro-plugins/package.json`
- Create: `packages/astro-plugins/tsconfig.json`
- Create: `packages/astro-plugins/vitest.config.ts`
- Create: `packages/astro-plugins/src/index.ts`

- [ ] **Step 1: Criar `packages/astro-plugins/package.json`**

```json
{
  "name": "@dgk/astro-plugins",
  "version": "0.1.0",
  "type": "module",
  "description": "Remark plugins for @dgk vault publishing",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/aretw0/vault-seed.git",
    "directory": "packages/astro-plugins"
  },
  "dependencies": {
    "remark-parse": "^11.0.0",
    "unified": "^11.0.0",
    "unist-util-visit": "^5.0.0"
  },
  "devDependencies": {
    "@types/mdast": "^4.0.0",
    "rehype-stringify": "^10.0.0",
    "remark": "^15.0.0",
    "remark-rehype": "^11.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Criar `packages/astro-plugins/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "src/__tests__"]
}
```

- [ ] **Step 3: Criar `packages/astro-plugins/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Criar `packages/astro-plugins/src/index.ts` (vazio por enquanto)**

```ts
export { default as remarkCallouts } from './remark-callouts.js';
export { default as remarkWikiImages } from './remark-wiki-images.js';
export { default as remarkWikiLinks } from './remark-wiki-links.js';
export { slugify } from './slugify.js';
```

Nota: os arquivos que este index exporta ainda não existem — serão criados nas próximas tasks. O TypeScript vai reclamar ao buildar mas os testes podem rodar individualmente.

- [ ] **Step 5: Instalar deps do pacote**

```bash
pnpm install
```

Expected: `@dgk/astro-plugins` resolvido no workspace, `node_modules` populado.

- [ ] **Step 6: Verificar que o pacote é reconhecido no workspace**

```bash
pnpm --filter @dgk/astro-plugins exec node --version
```

Expected: versão do Node (sem erro).

- [ ] **Step 7: Commit**

```bash
git add packages/astro-plugins/
git commit -m "feat(astro-plugins): scaffold @dgk/astro-plugins package"
```

---

### Task 2: `slugify.ts` — TDD

**Files:**
- Create: `packages/astro-plugins/src/slugify.ts`
- Create: `packages/astro-plugins/src/__tests__/slugify.test.ts`

- [ ] **Step 1: Criar o teste com os casos esperados**

```ts
// packages/astro-plugins/src/__tests__/slugify.test.ts
import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('strips numeric prefix from folder segment', () => {
    expect(slugify('40 - Recursos/O que é PARA')).toBe('recursos/o-que-e-para');
  });

  it('handles title without folder prefix', () => {
    expect(slugify('O que é o método PARA')).toBe('o-que-e-o-metodo-para');
  });

  it('strips diacritics and lowercases', () => {
    expect(slugify('Diário')).toBe('diario');
  });

  it('handles deeply nested paths', () => {
    expect(slugify('20 - Projetos/Planejar Férias')).toBe('projetos/planejar-ferias');
  });

  it('handles 99 - Meta e Anexos folder', () => {
    expect(slugify('99 - Meta e Anexos/Guia do Jardineiro Digital')).toBe(
      'meta-e-anexos/guia-do-jardineiro-digital'
    );
  });

  it('removes non-alphanumeric characters except hyphens and slashes', () => {
    expect(slugify('30 - Áreas/Saúde & Bem-Estar')).toBe('areas/saude-bem-estar');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: erro — `slugify.js` não encontrado.

- [ ] **Step 3: Implementar `slugify.ts`**

```ts
// packages/astro-plugins/src/slugify.ts

export function slugify(input: string): string {
  return input
    .split('/')
    .map(segment =>
      segment
        .replace(/^\d+\s*-\s*/, '')        // strip "40 - " prefix
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')   // strip diacritics (é→e, ã→a)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')             // spaces → hyphens
        .replace(/[^a-z0-9-]/g, '')       // remove special chars
        .replace(/-+/g, '-')              // collapse multiple hyphens
        .replace(/^-|-$/g, '')            // trim leading/trailing hyphens
    )
    .filter(Boolean)
    .join('/');
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add packages/astro-plugins/src/slugify.ts \
        packages/astro-plugins/src/__tests__/slugify.test.ts
git commit -m "feat(astro-plugins): add slugify utility with tests"
```

---

### Task 3: `remark-wiki-links.ts` — TDD (novo, com gating público/privado)

**Files:**
- Create: `packages/astro-plugins/src/remark-wiki-links.ts`
- Create: `packages/astro-plugins/src/__tests__/remark-wiki-links.test.ts`

O plugin `remark-wiki-link` do npm NÃO suporta gating — este é um plugin custom. A lógica: `[[Title]]` → `<a>` se o slug de Title está em `publishedSlugs`, caso contrário → texto simples.

- [ ] **Step 1: Criar o teste**

```ts
// packages/astro-plugins/src/__tests__/remark-wiki-links.test.ts
import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkWikiLinks from '../remark-wiki-links.js';

const published = new Set(['recursos/o-que-e-para', 'projetos/viagem']);

async function html(md: string, base = '') {
  const f = await remark()
    .use(remarkWikiLinks, { publishedSlugs: published, base })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  return String(f);
}

describe('remarkWikiLinks', () => {
  it('converts published wikilink to anchor', async () => {
    const out = await html('Veja [[O que é PARA]].');
    expect(out).toContain('<a href="/recursos/o-que-e-para">O que é PARA</a>');
  });

  it('converts private wikilink to plain text', async () => {
    const out = await html('Veja [[Nota Privada]].');
    expect(out).not.toContain('<a');
    expect(out).toContain('Nota Privada');
  });

  it('uses alias as link text for published note', async () => {
    const out = await html('Leia [[O que é PARA|método PARA]].');
    expect(out).toContain('<a href="/recursos/o-que-e-para">método PARA</a>');
  });

  it('uses alias as plain text for private note', async () => {
    const out = await html('Leia [[Privado|meu alias]].');
    expect(out).not.toContain('<a');
    expect(out).toContain('meu alias');
  });

  it('applies base prefix to href', async () => {
    const out = await html('[[O que é PARA]]', '/meu-vault');
    expect(out).toContain('href="/meu-vault/recursos/o-que-e-para"');
  });

  it('leaves regular markdown unmodified', async () => {
    const out = await html('Texto sem wikilinks.');
    expect(out).toContain('Texto sem wikilinks.');
    expect(out).not.toContain('<a');
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: erro — `remark-wiki-links.js` não encontrado.

- [ ] **Step 3: Implementar `remark-wiki-links.ts`**

```ts
// packages/astro-plugins/src/remark-wiki-links.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Link, Parent } from 'mdast';
import { slugify } from './slugify.js';

interface Options {
  publishedSlugs: Set<string>;
  base?: string;
}

const WIKI_LINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

const remarkWikiLinks: Plugin<[Options], Root> = (options) => {
  const { publishedSlugs, base = '' } = options;

  return (tree) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;

      const text = node.value;
      WIKI_LINK.lastIndex = 0;

      const children: (Text | Link)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let hasMatch = false;

      while ((match = WIKI_LINK.exec(text)) !== null) {
        hasMatch = true;
        const [fullMatch, title, alias] = match;
        const displayText = (alias ?? title).trim();
        const slug = slugify(title.trim());

        if (match.index > lastIndex) {
          children.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        if (publishedSlugs.has(slug)) {
          const link: Link = {
            type: 'link',
            url: `${base}/${slug}`,
            children: [{ type: 'text', value: displayText }],
          };
          children.push(link);
        } else {
          children.push({ type: 'text', value: displayText });
        }

        lastIndex = match.index + fullMatch.length;
      }

      if (!hasMatch) return;

      if (lastIndex < text.length) {
        children.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkWikiLinks;
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: todos os testes de slugify + remark-wiki-links passando (≥10 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/astro-plugins/src/remark-wiki-links.ts \
        packages/astro-plugins/src/__tests__/remark-wiki-links.test.ts
git commit -m "feat(astro-plugins): add remark-wiki-links with public/private gating"
```

---

### Task 4: `remark-wiki-images.ts` e `remark-callouts.ts` — port TypeScript

**Files:**
- Create: `packages/astro-plugins/src/remark-wiki-images.ts`
- Create: `packages/astro-plugins/src/remark-callouts.ts`
- Create: `packages/astro-plugins/src/__tests__/remark-wiki-images.test.ts`
- Create: `packages/astro-plugins/src/__tests__/remark-callouts.test.ts`

Porta os plugins JS do `astro-vault` para TypeScript. A lógica é idêntica — apenas adicionar tipos.

- [ ] **Step 1: Criar teste para wiki images**

```ts
// packages/astro-plugins/src/__tests__/remark-wiki-images.test.ts
import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkWikiImages from '../remark-wiki-images.js';

async function html(md: string, base = '') {
  const f = await remark()
    .use(remarkWikiImages, { base })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(f);
}

describe('remarkWikiImages', () => {
  it('converts wiki image embed to img tag with lazy loading', async () => {
    const out = await html('![[foto.png]]');
    expect(out).toContain('src="/assets/foto.png"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('alt="foto"');
  });

  it('uses explicit alt text when pipe syntax used', async () => {
    const out = await html('![[foto.png|Minha foto de viagem]]');
    expect(out).toContain('alt="Minha foto de viagem"');
  });

  it('applies base path to src', async () => {
    const out = await html('![[foto.png]]', '/meu-vault');
    expect(out).toContain('src="/meu-vault/assets/foto.png"');
  });

  it('does not transform standard markdown images', async () => {
    const out = await html('![alt](image.png)');
    expect(out).toContain('src="image.png"');
    expect(out).not.toContain('/assets/');
  });
});
```

- [ ] **Step 2: Criar teste para callouts**

```ts
// packages/astro-plugins/src/__tests__/remark-callouts.test.ts
import { describe, it, expect } from 'vitest';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkCallouts from '../remark-callouts.js';

async function html(md: string) {
  const f = await remark()
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(f);
}

describe('remarkCallouts', () => {
  it('converts Obsidian blockquote callout to aside element', async () => {
    const out = await html('> [!NOTE]\n> Conteúdo da nota.');
    expect(out).toContain('<aside');
    expect(out).toContain('callout-note');
  });

  it('uses custom title when provided', async () => {
    const out = await html('> [!WARNING] Atenção!\n> Texto.');
    expect(out).toContain('aria-label="Atenção!"');
    expect(out).toContain('callout-warning');
  });

  it('normalizes type aliases', async () => {
    const out = await html('> [!HINT]\n> Dica.');
    expect(out).toContain('callout-tip');
  });

  it('does not transform regular blockquotes', async () => {
    const out = await html('> Citação normal sem callout.');
    expect(out).not.toContain('<aside');
    expect(out).toContain('<blockquote>');
  });
});
```

- [ ] **Step 3: Rodar os testes para confirmar que falham**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: erros — `remark-wiki-images.js` e `remark-callouts.js` não encontrados.

- [ ] **Step 4: Criar `remark-wiki-images.ts`**

Port direto do JS do astro-vault para TypeScript. Adicionar a interface de opções:

```ts
// packages/astro-plugins/src/remark-wiki-images.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Image, Parent } from 'mdast';

interface Options {
  base?: string;
}

function filenameToAlt(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .trim();
}

const WIKI_IMAGE = /!\[\[(.*?)(?:\|(.*?))?\]\]/g;

const remarkWikiImages: Plugin<[Options?], Root> = (options = {}) => {
  const base = options.base ?? '';

  return (tree) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;

      const value = node.value;
      WIKI_IMAGE.lastIndex = 0;

      const children: (Text | Image)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let hasMatch = false;

      while ((match = WIKI_IMAGE.exec(value)) !== null) {
        hasMatch = true;
        const [fullMatch, filename, alt] = match;

        if (match.index > lastIndex) {
          children.push({ type: 'text', value: value.slice(lastIndex, match.index) });
        }

        const img: Image = {
          type: 'image',
          url: `${base}/assets/${filename}`,
          alt: alt ?? filenameToAlt(filename),
          title: null,
          data: { hProperties: { loading: 'lazy' } },
        };
        children.push(img);

        lastIndex = match.index + fullMatch.length;
      }

      if (!hasMatch) return;

      if (lastIndex < value.length) {
        children.push({ type: 'text', value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkWikiImages;
```

- [ ] **Step 5: Criar `remark-callouts.ts`**

Port direto do JS do astro-vault para TypeScript. As exportações mudam de `export default function` para uma function com tipos explícitos. Ver o arquivo JS de referência em `~/Documents/GitHub/astro-vault/src/plugins/remark-callouts.js` e portar adicionando:
- `import type { Root } from 'mdast'`
- `import type { Plugin } from 'unified'`
- Tipos para as funções internas (`normalizeCalloutType(type: string): string`, etc.)
- Tipo para `options: CalloutOptions` com `types?: Record<string, { color?: string }>`
- Assinatura: `const remarkCallouts: Plugin<[CalloutOptions?], Root> = (options = {}) => { ... }`

O corpo do plugin permanece idêntico ao JS — apenas adicionar tipos nas assinaturas de função.

- [ ] **Step 6: Rodar todos os testes**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: todos os testes passando (≥20 testes no total entre os 4 arquivos).

- [ ] **Step 7: Commit**

```bash
git add packages/astro-plugins/src/remark-wiki-images.ts \
        packages/astro-plugins/src/remark-callouts.ts \
        packages/astro-plugins/src/__tests__/remark-wiki-images.test.ts \
        packages/astro-plugins/src/__tests__/remark-callouts.test.ts
git commit -m "feat(astro-plugins): port remark-wiki-images and remark-callouts from astro-vault"
```

---

### Task 5: Build do pacote e verificação

**Files:**
- Modify: `packages/astro-plugins/src/index.ts` (já criado, verificar exports)

- [ ] **Step 1: Garantir que `index.ts` exporta tudo**

```ts
// packages/astro-plugins/src/index.ts
export { default as remarkCallouts } from './remark-callouts.js';
export { default as remarkWikiImages } from './remark-wiki-images.js';
export { default as remarkWikiLinks } from './remark-wiki-links.js';
export { slugify } from './slugify.js';
```

- [ ] **Step 2: Build do pacote**

```bash
pnpm --filter @dgk/astro-plugins build
```

Expected: `packages/astro-plugins/dist/` criado com arquivos `.js`, `.d.ts`, `.js.map`.

- [ ] **Step 3: Verificar exports do build**

```bash
node -e "import('@dgk/astro-plugins').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'remarkCallouts', 'remarkWikiImages', 'remarkWikiLinks', 'slugify' ]`

- [ ] **Step 4: Rodar todos os testes uma última vez**

```bash
pnpm --filter @dgk/astro-plugins test
```

Expected: todos passando.

- [ ] **Step 5: Commit**

```bash
git add packages/astro-plugins/src/index.ts
git commit -m "feat(astro-plugins): finalize @dgk/astro-plugins package with all exports"
```

---

### Task 6: Astro + Starlight — deps e configuração principal

**Files:**
- Modify: `package.json` (root)
- Create: `astro.config.mjs`
- Create: `.site/integrations/collect-published-slugs.ts`

- [ ] **Step 1: Adicionar deps Astro ao `package.json` root**

```bash
pnpm add -D astro@^6 @astrojs/starlight gray-matter glob remark-directive
pnpm add @dgk/astro-plugins@workspace:^
```

Verificar que as deps foram adicionadas:

```bash
node -e "const p = require('./package.json'); console.log(p.devDependencies['astro'], p.devDependencies['@astrojs/starlight'])"
```

Expected: versões `^6.x.x` e `^0.x.x` respectivamente.

- [ ] **Step 2: Criar `.site/integrations/collect-published-slugs.ts`**

```ts
// .site/integrations/collect-published-slugs.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

export async function collectPublishedSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>();
  const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
  const files = globSync(patterns, { cwd: process.cwd() });

  for (const file of files) {
    const raw = readFileSync(join(process.cwd(), file), 'utf-8');
    const { data } = matter(raw);
    if (data.status === 'published') {
      slugs.add(slugify(file.replace(/\.md$/, '')));
    }
  }

  return slugs;
}
```

- [ ] **Step 3: Criar `astro.config.mjs`**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkDirective from 'remark-directive';
import { remarkCallouts, remarkWikiImages, remarkWikiLinks } from '@dgk/astro-plugins';
import { collectPublishedSlugs } from './.site/integrations/collect-published-slugs.js';

const site = process.env.ASTRO_SITE ?? 'https://username.github.io';
const base = process.env.ASTRO_BASE ?? '/vault-name';
const publishedSlugs = await collectPublishedSlugs();

export default defineConfig({
  srcDir: '.site',
  site,
  base,
  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkCallouts,
      [remarkWikiImages, { base }],
      [remarkWikiLinks, { publishedSlugs, base }],
    ],
  },
  integrations: [
    starlight({
      title: process.env.VAULT_TITLE ?? 'Meu Vault',
      defaultLocale: 'pt-BR',
      social: process.env.GITHUB_REPOSITORY
        ? [{ icon: 'github', label: 'GitHub', href: `https://github.com/${process.env.GITHUB_REPOSITORY}` }]
        : [],
      sidebar: [
        { label: 'Recursos',  autogenerate: { directory: 'recursos' } },
        { label: 'Projetos',  autogenerate: { directory: 'projetos' } },
        { label: 'Áreas',     autogenerate: { directory: 'areas' } },
        { label: 'Meta',      autogenerate: { directory: 'meta-e-anexos' } },
      ],
      customCss: ['./.site/styles/custom.css'],
    }),
  ],
});
```

Nota: `social` usa o formato de array introduzido no Starlight recente. Verificar a versão instalada do `@astrojs/starlight` e ajustar se necessário — versões mais antigas usam objeto `{ github: 'URL' }`.

- [ ] **Step 4: Verificar que o `astro.config.mjs` importa sem erro de sintaxe**

```bash
node --input-type=module --eval "import './astro.config.mjs'"
```

Expected: sem erro (pode gerar warnings de deps não encontradas, mas sem syntax error).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs \
        .site/integrations/collect-published-slugs.ts
git commit -m "feat(site): add Astro 6 + Starlight config and collect-published-slugs integration"
```

---

### Task 7: Content Layer — vault loader

**Files:**
- Create: `.site/content/config.ts`

O vault loader lê as pastas do vault diretamente, filtra `status: published` e alimenta a coleção `docs` do Starlight.

- [ ] **Step 1: Criar `.site/content/config.ts`**

```ts
// .site/content/config.ts
import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { slugify } from '@dgk/astro-plugins';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

export const collections = {
  docs: defineCollection({
    loader: async ({ store, logger }: { store: any; logger: any }) => {
      const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
      const files = globSync(patterns, { cwd: process.cwd() });
      let count = 0;

      for (const file of files) {
        const fullPath = join(process.cwd(), file);
        const raw = readFileSync(fullPath, 'utf-8');
        const { data, content } = matter(raw);

        if (data.status !== 'published') continue;

        const id = slugify(file.replace(/\.md$/, ''));
        const title: string = data.title ?? basename(file, '.md');

        store.set({
          id,
          data: { ...data, title },
          body: content,
        });
        count++;
      }

      logger.info(`Vault loader: ${count} published notes loaded`);
    },
    schema: docsSchema({
      extend: z.object({
        status: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        category: z.string().optional(),
        audience: z.string().optional(),
        related: z.array(z.string()).optional(),
      }),
    }),
  }),
};
```

Nota: o tipo `{ store: any; logger: any }` é temporário — Astro exporta os tipos corretos do loader em `astro/loaders`. Após a instalação, verificar e usar os tipos corretos se disponíveis.

- [ ] **Step 2: Criar `.site/styles/custom.css` (overrides CSS mínimos do Starlight)**

```css
/* .site/styles/custom.css */
:root {
  --sl-font: system-ui, -apple-system, sans-serif;
}

/* Callout styles — complementam os do @dgk/astro-plugins */
.callout {
  border-left: 4px solid var(--callout-color, var(--sl-color-accent));
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  border-radius: 0 0.25rem 0.25rem 0;
  background-color: color-mix(in srgb, var(--callout-color, var(--sl-color-accent)) 10%, transparent);
}

.callout-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
```

- [ ] **Step 3: Verificar que o conteúdo da coleção é importável (smoke)**

```bash
node --input-type=module --eval "
import { collections } from './.site/content/config.ts'
  .catch(e => { process.exit(1) });
" 2>&1 | head -5
```

Expected: sem erro de importação (pode ter warning de TypeScript não compilado — ok neste passo).

- [ ] **Step 4: Commit**

```bash
git add .site/content/config.ts .site/styles/custom.css
git commit -m "feat(site): add vault Content Layer loader and Starlight CSS overrides"
```

---

### Task 8: Scripts npm e smoke test de build local

**Files:**
- Modify: `package.json`
- Modify: `package.template.json`

- [ ] **Step 1: Adicionar scripts de site em `package.json`**

Na seção `scripts` do root `package.json`, adicionar após `validate:onboarding`:

```json
"site:dev":   "astro dev",
"site:build": "pnpm --filter @dgk/astro-plugins build && astro build",
"site:preview": "astro preview"
```

- [ ] **Step 2: Adicionar os mesmos scripts em `package.template.json`**

Na seção `scripts` do `package.template.json`, adicionar após `validate:onboarding`:

```json
"site:dev":   "astro dev",
"site:build": "astro build",
"site:preview": "astro preview"
```

Nota: no `package.template.json`, o `site:build` não inclui o build de `@dgk/astro-plugins` pois o usuário recebe o pacote publicado no npm.

- [ ] **Step 3: Adicionar deps Astro em `package.template.json`**

Na seção `devDependencies` do `package.template.json`, adicionar:

```json
"@astrojs/starlight": "^0.30.0",
"@dgk/astro-plugins": "^0.1.0",
"astro": "^6.3.0",
"glob": "^11.0.0",
"gray-matter": "^4.0.3",
"remark-directive": "^3.0.0"
```

Verificar as versões exatas instaladas via `pnpm list astro @astrojs/starlight` antes de fixar.

- [ ] **Step 4: Rodar `pnpm run site:build` para smoke test**

```bash
pnpm run site:build
```

Expected: build do Astro completa sem erros, `dist/` criado.

```bash
ls dist/
```

Expected: arquivos HTML, CSS, JS do site estático.

- [ ] **Step 5: Verificar que notas publicadas aparecem no output**

```bash
find dist/ -name "*.html" | head -10
```

Expected: arquivos HTML correspondendo às notas com `status: published` do vault (ex: `dist/meta-e-anexos/visualizacao-do-fluxo-do-vault/index.html`).

- [ ] **Step 6: Verificar que nenhuma nota privada aparece no output**

```bash
# Notas com status diferente de published NÃO devem estar em dist/
# Exemplo: checar que uma nota sem status não gerou página
ls dist/entrada/ 2>/dev/null || echo "OK: pasta entrada não existe em dist (notas não publicadas)"
```

- [ ] **Step 7: Commit**

```bash
git add package.json package.template.json pnpm-lock.yaml
git commit -m "feat(site): add site:build/dev/preview scripts and Astro deps"
```

---

### Task 9: CI workflow `deploy-site.yml`

**Files:**
- Create: `.github/workflows/deploy-site.yml`

**Nota:** `actions/upload-pages-artifact` e `actions/deploy-pages` — verificar hashes atuais em:
- `https://github.com/actions/upload-pages-artifact/releases`
- `https://github.com/actions/deploy-pages/releases`

Antes de fazer merge para main, substituir os hashes pelos valores da versão mais recente.

- [ ] **Step 1: Criar `.github/workflows/deploy-site.yml`**

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
    name: Build Astro site
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Setup
        uses: ./.github/actions/setup

      - name: Build @dgk/astro-plugins
        run: pnpm --filter @dgk/astro-plugins build

      - name: Build site
        run: pnpm run site:build
        env:
          ASTRO_SITE: https://${{ github.repository_owner }}.github.io
          ASTRO_BASE: /${{ github.event.repository.name }}
          GITHUB_REPOSITORY: ${{ github.repository }}

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@HASH_TO_VERIFY # v3 — verificar hash atual
        with:
          path: dist/

  deploy:
    name: Deploy to GitHub Pages
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@HASH_TO_VERIFY # v4 — verificar hash atual
```

- [ ] **Step 2: Verificar que o YAML é válido**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-site.yml'))" && echo "YAML válido"
```

Expected: `YAML válido`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-site.yml
git commit -m "ci: add deploy-site workflow for Astro GitHub Pages"
```

---

### Task 10: Template boundary e publicação do pacote

**Files:**
- Modify: `.github/workflows/publish-cli.yml`

Nota: `initialize.yml` já lista `packages` em `files_to_remove` — `packages/astro-plugins` é removido automaticamente. Nenhuma mudança necessária no `initialize.yml` para este spec.

- [ ] **Step 1: Atualizar trigger do `publish-cli.yml` para incluir `@dgk/astro-plugins`**

Localizar a seção `on: push: tags:` no arquivo e atualizar:

```yaml
on:
  push:
    tags:
      - '@dgk/cli@*'
      - '@dgk/astro-plugins@*'
```

- [ ] **Step 2: Verificar o arquivo após a edição**

```bash
grep -A5 "^on:" .github/workflows/publish-cli.yml
```

Expected: os dois patterns de tag presentes.

- [ ] **Step 3: Criar um `.changeset` inicial para `@dgk/astro-plugins`**

```bash
pnpm changeset
```

Selecionar: `@dgk/astro-plugins`, tipo `minor`, mensagem `feat: initial release with remark plugins for vault publishing`.

Verificar que o arquivo de changeset foi criado:

```bash
ls .changeset/*.md | tail -1 | xargs head -5
```

Expected: arquivo com `"@dgk/astro-plugins": minor`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish-cli.yml .changeset/
git commit -m "ci: extend publish workflow for @dgk/astro-plugins and add initial changeset"
```

---

### Task 11: Validação final (gate)

- [ ] **Step 1: Build completo do workspace**

```bash
pnpm --filter @dgk/astro-plugins build && pnpm run site:build
```

Expected: sem erros. `dist/` gerado.

- [ ] **Step 2: Contar páginas publicadas**

```bash
find dist/ -name "index.html" | wc -l
```

Expected: número maior que 0. As notas com `status: published` do vault geram páginas.

- [ ] **Step 3: Verificar que wikilinks públicos estão como links no HTML**

Pegar uma nota publicada que contém wikilinks para outras notas publicadas e verificar que os links aparecem no HTML:

```bash
# Substitua pelo slug real de uma nota publicada que contém [[wikilinks]]
grep -r 'href=' dist/meta-e-anexos/ | head -5
```

Expected: links `<a href="...">` presentes nas notas publicadas.

- [ ] **Step 4: Verificar que pipeline de testes existente não foi quebrado**

```bash
pnpm run validate
```

Expected: lint + tests + validate:onboarding + smoke:template — todos passando.

- [ ] **Step 5: Verificar estrutura de arquivos críticos**

```bash
ls astro.config.mjs \
   ".site/content/config.ts" \
   ".site/integrations/collect-published-slugs.ts" \
   ".site/styles/custom.css" \
   ".github/workflows/deploy-site.yml" \
   "packages/astro-plugins/src/index.ts" \
   "packages/astro-plugins/dist/index.js"
```

Expected: todos os arquivos listados sem erro.

- [ ] **Step 6: Verificar YAML dos workflows**

```bash
python3 -c "
import yaml
for f in ['.github/workflows/deploy-site.yml', '.github/workflows/publish-cli.yml']:
    yaml.safe_load(open(f))
    print(f'OK: {f}')
"
```

Expected:
```
OK: .github/workflows/deploy-site.yml
OK: .github/workflows/publish-cli.yml
```

- [ ] **Step 7: Push**

```bash
git status
# Expected: nothing to commit

git push origin develop
```

---

## Nota sobre GitHub Pages

Para que o deploy funcione no repositório do usuário, ele precisa habilitar GitHub Pages uma vez nas configurações do repo:
- `Settings → Pages → Source → GitHub Actions`

Isso é uma ação manual — não pode ser automatizada via workflow. Incluir instrução em `99 - Meta e Anexos/Preparando seu Computador para o Vault.md` (ou doc equivalente) sobre este passo.

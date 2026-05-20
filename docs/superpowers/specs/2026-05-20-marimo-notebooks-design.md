# Notebooks Marimo para o Vault

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Marimo ao vault-seed para que o usuário possa explorar a saúde do vault via notebooks interativos publicados como WASM em `/analysis/` no GitHub Pages, com dois notebooks de análise prontos e dois starters para uso pessoal.

**Architecture:** Notebooks vivem em `99 - Meta e Anexos/Notebooks/` (vai com o usuário). O build Astro gera `public/analysis/vault-data.json` com metadados completos de todas as notas. `marimo export html-wasm` exporta os notebooks de análise para `dist/analysis/`, que é servido pelo GitHub Pages junto com o site Astro. Versão do Marimo fixada em `requirements.txt` — usada tanto no devcontainer quanto no CI.

**Tech Stack:** Marimo (versão pinada), Python 3.12, Altair (charts), pnpm workspaces, GitHub Actions, Dependabot (pip + npm)

---

## Pré-requisito

Este spec deve ser implementado **após** o rename PT-BR (`2026-05-19-renomear-pastas-pt-br-e-migrar-changesets.md`) e o Astro vault publishing (`2026-05-20-astro-vault-publishing.md`). Todos os paths usam os nomes PT-BR. O `generate-vault-json.ts` reutiliza a lógica de `collect-published-slugs.ts`.

---

## Estrutura de arquivos

```
repo root/
├── requirements.txt                              ← marimo==X.Y.Z (pinado)
├── 99 - Meta e Anexos/
│   └── Notebooks/
│       ├── analise-publicacao.py                 ← publishing readiness dashboard
│       ├── analise-grafo.py                      ← graph health analysis
│       └── starters/
│           ├── revisao-diaria.py                 ← starter: notas do dia
│           └── explorador.py                     ← starter: busca/filtro interativo
├── .site/
│   ├── integrations/
│   │   ├── collect-published-slugs.ts            ← existente (Astro spec)
│   │   └── generate-vault-json.ts                ← novo: gera vault-data.json
│   └── pages/
│       └── analysis/
│           └── index.astro                       ← índice Starlight para os notebooks
└── .github/
    ├── dependabot.yml                            ← adiciona ecosystem: pip
    └── workflows/
        └── deploy-site.yml                       ← adiciona install marimo + export
```

---

## `requirements.txt`

```
marimo==X.Y.Z
altair==X.Y.Z
```

Versão exata definida no momento da implementação via `pip index versions marimo | head -1`. Tanto o `post-create.sh` do devcontainer quanto o CI instalam com `pip install -r requirements.txt` — nenhuma divergência de versão entre ambientes.

---

## Vault Data JSON — `generate-vault-json.ts`

Extensão de `collect-published-slugs.ts`. Roda durante o build Astro via integração, escrevendo `public/analysis/vault-data.json`.

### Schema

```ts
interface VaultNote {
  id: string;          // slug: "recursos/o-que-e-para"
  title: string;       // frontmatter title ou basename do arquivo
  folder: string;      // pasta raiz: "40 - Recursos"
  status: 'published' | 'draft' | null;
  tags: string[];      // frontmatter tags ou []
  links: string[];     // slugs de wikilinks encontrados no body
  created: string | null;
  updated: string | null;
}

interface VaultData {
  generated: string;   // ISO 8601
  notes: VaultNote[];
}
```

**Todas as notas** são incluídas (não só as publicadas), para que os notebooks de análise mostrem o quadro completo — drafts, notas sem status, etc.

### Parsing de wikilinks

A extração de `links` usa a mesma regex de `remark-wiki-links.ts`:

```ts
const WIKI_LINK = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
```

Cada match é passado por `slugify()` para normalizar. Links para arquivos inexistentes no vault ficam no array — o notebook de análise de grafo identifica esses como "links quebrados".

### Integração Astro

```ts
// .site/integrations/generate-vault-json.ts
import type { AstroIntegration } from 'astro';

export function generateVaultJson(): AstroIntegration {
  return {
    name: 'generate-vault-json',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        // lê todas as notas, escreve public/analysis/vault-data.json
      },
    },
  };
}
```

Adicionada em `astro.config.mjs` junto com `starlight(...)`.

---

## Notebooks de Análise

### Padrão de fetch (funciona em dev e WASM)

```python
import marimo as mo
import json

# Em dev local: caminho relativo ao servidor Marimo
# Em WASM: fetch da URL relativa ao HTML exportado
try:
    import pyodide  # type: ignore
    from pyodide.http import open_url  # type: ignore
    data = json.loads(open_url("./vault-data.json").read())
except ImportError:
    import urllib.request, os
    json_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "analysis", "vault-data.json")
    with urllib.request.urlopen(f"file://{os.path.abspath(json_path)}") as r:
        data = json.loads(r.read())

notes = data["notes"]
```

### `analise-publicacao.py` — Publishing Readiness

Seções:
1. **Resumo**: total de notas, por pasta (bar chart Altair)
2. **Status**: breakdown `published` / `draft` / sem status (donut chart)
3. **Notas sem título**: lista de notas onde `title` é derivado do basename
4. **Top tags**: 20 tags mais frequentes (bar chart horizontal)
5. **Filtro interativo**: dropdown de pasta → tabela filtrada

### `analise-grafo.py` — Graph Health

Seções:
1. **Notas órfãs**: `links == []` AND nenhuma nota aponta para ela (computed via inverse index)
2. **Links quebrados**: `links` contém slugs que não existem no vault
3. **Densidade de links**: outgoing links / contagem de notas por pasta (bar chart)
4. **Top 10 mais referenciadas**: notas com mais inbound links

### Starters

**`revisao-diaria.py`**: filtra notas por `created`/`updated` igual à data de hoje, conta notas em `00 - Entrada`, lista drafts recentes. Serve como painel matinal.

**`explorador.py`**: busca reativa — dropdown de pasta, multiselect de tags, filtro de status. Retorna tabela paginada de notas correspondentes. Ponto de partida para queries personalizadas.

---

## `/analysis/` Index Page

```astro
---
// .site/pages/analysis/index.astro
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro';
---
<StarlightPage frontmatter={{ title: 'Análise do Vault' }}>
  <p>Notebooks interativos para explorar a saúde do seu vault.</p>
  <ul>
    <li><a href="./publishing.html">📊 Publicação — status e tags das notas</a></li>
    <li><a href="./graph.html">🕸️ Grafo — links órfãos e quebrados</a></li>
  </ul>
</StarlightPage>
```

---

## Devcontainer

Em `.devcontainer/post-create.sh`, na seção de ferramentas (antes do readiness gate):

```bash
pip install -r requirements.txt \
  || echo "[aviso] pip install falhou. Execute: pip install -r requirements.txt"
```

Em `devcontainer.json`, adicionar porta 2718 ao `forwardPorts`:
```json
"forwardPorts": [2718]
```

Script em `package.json`:
```json
"notebooks:dev": "marimo edit \"99 - Meta e Anexos/Notebooks\""
```

`pnpm run notebooks:dev` abre o browser Marimo em `localhost:2718`.

---

## CI — Extensões ao `deploy-site.yml`

### Paths trigger (adicionar):
```yaml
- "99 - Meta e Anexos/Notebooks/**"
- "requirements.txt"
```

### Steps (adicionar após o build do Astro, antes do upload do artifact):

```yaml
- name: Install Python dependencies
  run: pip install -r requirements.txt

- name: Export analysis notebooks
  run: |
    mkdir -p dist/analysis
    marimo export html-wasm \
      "99 - Meta e Anexos/Notebooks/analise-publicacao.py" \
      --output dist/analysis/publishing.html
    marimo export html-wasm \
      "99 - Meta e Anexos/Notebooks/analise-grafo.py" \
      --output dist/analysis/graph.html
```

`vault-data.json` já está em `dist/analysis/` neste ponto (copiado do `public/analysis/` pelo build Astro).

---

## Dependabot — Ecosystem pip

Em `.github/dependabot.yml`, adicionar entrada ao array `updates`:

```yaml
- package-ecosystem: pip
  directory: /
  schedule:
    interval: weekly
  labels:
    - dependencies
```

Qualquer bump de versão do Marimo ou Altair cria um PR automático, passa por CI, e só entra via merge — mesmo fluxo dos bumps npm.

---

## Fronteira do template (`initialize.yml`)

### O usuário **herda**:
- `99 - Meta e Anexos/Notebooks/` — notebooks prontos para uso
- `requirements.txt` — versão pinada do Marimo
- `.site/integrations/generate-vault-json.ts` — geração do JSON
- `.site/pages/analysis/index.astro` — índice dos notebooks
- `.github/workflows/deploy-site.yml` — já atualizado com export

### Nenhuma mudança em `files_to_remove`:
Os notebooks vivem dentro do vault (`99 - Meta e Anexos/`), que já vai para o usuário. Nenhum arquivo novo em `packages/` ou `docs/`.

---

## O que não está no escopo

- Write-back de notebooks para o vault (read-only sempre)
- Marimo server mode em produção (WASM only no GitHub Pages)
- Versionamento de notebooks via changesets (notebooks são conteúdo, não pacote publicado)
- Notebooks adicionais neste ciclo — usuário pode criar os próprios em `Notebooks/starters/`
- Cache de pip no CI (Marimo instala rápido; adicionar se o build exceder timeout)

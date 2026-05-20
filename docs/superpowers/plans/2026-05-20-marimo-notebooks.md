# Marimo Notebooks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Marimo ao vault-seed: dois notebooks de análise do vault (publicação e grafo) exportados como WASM para `/analysis/` no GitHub Pages, mais dois starters para o usuário, com versão pinada via `requirements.txt` e Dependabot pip.

**Architecture:** O build Astro dispara uma integração customizada que escreve `public/analysis/vault-data.json` com metadados de todas as notas. `marimo export html-wasm` exporta os notebooks de análise para `dist/analysis/`. O site GitHub Pages serve tudo de `dist/`. Notebooks vivem em `99 - Meta e Anexos/Notebooks/` e vão com o usuário.

**Tech Stack:** Marimo (pinado), Altair, Pandas, Python 3.12 (uv no devcontainer / pip no CI), Astro integration hooks, GitHub Actions

---

## Pré-requisitos

Este plano deve ser executado **após**:
1. `2026-05-19-renomear-pastas-pt-br-e-migrar-changesets.md` — paths PT-BR
2. `2026-05-20-astro-vault-publishing.md` — cria `astro.config.mjs`, `.site/integrations/collect-published-slugs.ts`, `deploy-site.yml`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `requirements.txt` | Criar | Versões pinadas de marimo, altair, pandas |
| `.site/integrations/generate-vault-json.ts` | Criar | Astro integration: gera `public/analysis/vault-data.json` |
| `astro.config.mjs` | Modificar | Adicionar `generateVaultJson()` ao array `integrations` |
| `99 - Meta e Anexos/Notebooks/analise-publicacao.py` | Criar | Dashboard de publicação (status, tags, pastas) |
| `99 - Meta e Anexos/Notebooks/analise-grafo.py` | Criar | Análise de grafo (órfãs, links quebrados, densidade) |
| `99 - Meta e Anexos/Notebooks/starters/revisao-diaria.py` | Criar | Starter: notas do dia |
| `99 - Meta e Anexos/Notebooks/starters/explorador.py` | Criar | Starter: busca/filtro interativo |
| `.site/pages/analysis/index.astro` | Criar | Página Starlight que linka para os dois notebooks |
| `.devcontainer/post-create.sh` | Modificar | Adicionar `uv pip install -r requirements.txt` + marimo no readiness gate |
| `.devcontainer/devcontainer.json` | Modificar | Adicionar porta 2718 ao `forwardPorts` |
| `package.json` | Modificar | Adicionar script `notebooks:dev` |
| `.github/dependabot.yml` | Modificar ou criar | Adicionar ecosystem pip |
| `.github/workflows/deploy-site.yml` | Modificar | Adicionar path triggers + steps de install + marimo export |

---

### Task 1: `requirements.txt` — Pinagem de versões Python

**Files:**
- Create: `requirements.txt`

- [ ] **Step 1: Buscar versões atuais**

```bash
pip index versions marimo 2>/dev/null | grep "Available versions" | head -1
pip index versions altair 2>/dev/null | grep "Available versions" | head -1
pip index versions pandas 2>/dev/null | grep "Available versions" | head -1
```

Se `pip index` não estiver disponível (CI ou ambiente sem pip), usar:

```bash
curl -s https://pypi.org/pypi/marimo/json | grep -o '"version":"[^"]*"' | head -1
curl -s https://pypi.org/pypi/altair/json | grep -o '"version":"[^"]*"' | head -1
curl -s https://pypi.org/pypi/pandas/json | grep -o '"version":"[^"]*"' | head -1
```

- [ ] **Step 2: Criar `requirements.txt` com as versões exatas encontradas**

Substitua `X.Y.Z` pelas versões obtidas no Step 1:

```
marimo==X.Y.Z
altair==X.Y.Z
pandas==X.Y.Z
```

Exemplo (versões reais no momento de escrita deste plano):
```
marimo==0.13.14
altair==5.5.0
pandas==2.2.3
```

- [ ] **Step 3: Verificar**

```bash
cat requirements.txt
```

Expected: três linhas com `==` e sem ranges (`^`, `~`, `>=`).

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: add requirements.txt with pinned Python deps"
```

---

### Task 2: Integração Astro `generate-vault-json.ts` + `astro.config.mjs`

**Files:**
- Create: `.site/integrations/generate-vault-json.ts`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Criar `.site/integrations/generate-vault-json.ts`**

```typescript
import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { globSync } from 'glob';
import matter from 'gray-matter';

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

const WIKI_LINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

function slugify(input: string): string {
  return input
    .split('/')
    .map(segment =>
      segment
        .replace(/^\d+\s*-\s*/, '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean)
    .join('/');
}

export function generateVaultJson(): AstroIntegration {
  return {
    name: 'generate-vault-json',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        const cwd = process.cwd();
        const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
        const files = globSync(patterns, { cwd });

        const notes = files.map(file => {
          const raw = readFileSync(join(cwd, file), 'utf-8');
          const { data, content } = matter(raw);
          const id = slugify(file.replace(/\.md$/, ''));
          const links: string[] = [];
          const re = new RegExp(WIKI_LINK_RE.source, WIKI_LINK_RE.flags);
          let match: RegExpExecArray | null;
          while ((match = re.exec(content)) !== null) {
            links.push(slugify(match[1]));
          }
          return {
            id,
            title: (data.title as string | undefined) ?? basename(file, '.md'),
            folder: file.split('/')[0],
            status: (data.status as string | undefined) ?? null,
            tags: (data.tags as string[] | undefined) ?? [],
            links,
            created: (data.created as string | undefined) ?? null,
            updated: (data.updated as string | undefined) ?? null,
          };
        });

        const outDir = join(cwd, 'public', 'analysis');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(
          join(outDir, 'vault-data.json'),
          JSON.stringify({ generated: new Date().toISOString(), notes }, null, 2)
        );
        logger.info(`vault-data.json: ${notes.length} notas escritas`);
      },
    },
  };
}
```

- [ ] **Step 2: Modificar `astro.config.mjs` — adicionar import e integração**

No topo do arquivo, após os imports existentes, adicionar:

```js
import { generateVaultJson } from './.site/integrations/generate-vault-json.ts';
```

No array `integrations`, adicionar `generateVaultJson()` após `starlight(...)`:

```js
integrations: [
  starlight({ /* ... configuração existente ... */ }),
  generateVaultJson(),
],
```

- [ ] **Step 3: Verificar TypeScript**

```bash
pnpm --filter @dgk/astro-plugins build
npx tsc --noEmit --project tsconfig.json 2>/dev/null || echo "sem tsconfig raiz — ok"
```

- [ ] **Step 4: Smoke test — verificar geração do JSON**

```bash
pnpm run site:build 2>&1 | grep "vault-data.json"
```

Expected: linha como `vault-data.json: 42 notas escritas`

```bash
ls public/analysis/vault-data.json
node -e "const d=require('./public/analysis/vault-data.json'); console.log('notas:', d.notes.length, '| gerado:', d.generated)"
```

Expected: `notas: <N> | gerado: 2026-...`

- [ ] **Step 5: Commit**

```bash
git add .site/integrations/generate-vault-json.ts astro.config.mjs
git commit -m "feat(site): add generate-vault-json Astro integration"
```

---

### Task 3: Notebook `analise-publicacao.py`

**Files:**
- Create: `99 - Meta e Anexos/Notebooks/analise-publicacao.py`

- [ ] **Step 1: Criar o diretório e o notebook**

```bash
mkdir -p "99 - Meta e Anexos/Notebooks"
```

Criar `99 - Meta e Anexos/Notebooks/analise-publicacao.py`:

```python
import marimo

app = marimo.App(width="medium", title="Análise de Publicação")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    return json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore
        _raw = open_url("./vault-data.json").read()
        data = json.loads(_raw)
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "analysis", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(data, mo, notes):
    mo.md(
        f"# 📊 Análise de Publicação\n\n"
        f"**{len(notes)} notas** no vault · gerado em `{data['generated'][:10]}`"
    )
    return ()


@app.cell
def _(mo, notes):
    import altair as alt
    import pandas as pd
    from collections import Counter

    _counts = Counter((n.get("status") or "sem status") for n in notes)
    _df = pd.DataFrame([{"status": k, "count": v} for k, v in _counts.items()])
    _chart = (
        alt.Chart(_df)
        .mark_arc(innerRadius=50)
        .encode(
            theta=alt.Theta("count:Q"),
            color=alt.Color(
                "status:N",
                scale=alt.Scale(
                    domain=["published", "draft", "sem status"],
                    range=["#22c55e", "#f59e0b", "#94a3b8"],
                ),
            ),
            tooltip=["status:N", "count:Q"],
        )
        .properties(title="Status das Notas", width=300, height=300)
    )
    mo.ui.altair_chart(_chart)
    return Counter, alt, pd


@app.cell
def _(Counter, alt, mo, notes, pd):
    _counts = Counter(n["folder"] for n in notes)
    _df = pd.DataFrame([{"pasta": k, "notas": v} for k, v in _counts.most_common()])
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("notas:Q", title="Notas"),
            y=alt.Y("pasta:N", sort="-x", title="Pasta"),
            tooltip=["pasta:N", "notas:Q"],
        )
        .properties(title="Notas por Pasta", height=250)
    )
    mo.ui.altair_chart(_chart)
    return ()


@app.cell
def _(Counter, alt, mo, notes, pd):
    _all_tags = [tag for n in notes for tag in n.get("tags", [])]
    _counts = Counter(_all_tags).most_common(20)
    _df = pd.DataFrame(_counts, columns=["tag", "count"])
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("count:Q", title="Frequência"),
            y=alt.Y("tag:N", sort="-x", title="Tag"),
            tooltip=["tag:N", "count:Q"],
        )
        .properties(title="Top 20 Tags", height=400)
    )
    mo.ui.altair_chart(_chart)
    return ()


@app.cell
def _(mo, notes):
    _no_title = [n for n in notes if n["title"] == n["id"].split("/")[-1].replace("-", " ")]
    mo.md(f"## 🏷️ Notas sem título explícito\n\n{len(_no_title)} notas usam o basename como título.")
    return ()


@app.cell
def _(mo, notes):
    import pandas as _pd
    _folders = sorted({n["folder"] for n in notes})
    dropdown = mo.ui.dropdown(options=["Todas"] + _folders, value="Todas", label="Filtrar por pasta")
    dropdown
    return (dropdown,)


@app.cell
def _(dropdown, mo, notes):
    import pandas as _pd2
    _filtered = notes if dropdown.value == "Todas" else [n for n in notes if n["folder"] == dropdown.value]
    _df = _pd2.DataFrame(_filtered)[["id", "title", "folder", "status"]]
    mo.ui.table(_df)
    return ()


if __name__ == "__main__":
    app.run()
```

- [ ] **Step 2: Verificar sintaxe Python**

```bash
python3 -c "
import ast, sys
src = open('99 - Meta e Anexos/Notebooks/analise-publicacao.py').read()
ast.parse(src)
print('OK: sintaxe válida')
" || python -c "
import ast
src = open('99 - Meta e Anexos/Notebooks/analise-publicacao.py').read()
ast.parse(src)
print('OK: sintaxe valida')
"
```

Expected: `OK: sintaxe válida`

- [ ] **Step 3: Commit**

```bash
git add "99 - Meta e Anexos/Notebooks/analise-publicacao.py"
git commit -m "feat(notebooks): add publishing readiness analysis notebook"
```

---

### Task 4: Notebook `analise-grafo.py`

**Files:**
- Create: `99 - Meta e Anexos/Notebooks/analise-grafo.py`

- [ ] **Step 1: Criar o notebook**

```python
import marimo

app = marimo.App(width="medium", title="Análise de Grafo")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    return json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore
        data = json.loads(open_url("./vault-data.json").read())
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "analysis", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(data, mo, notes):
    mo.md(
        f"# 🕸️ Análise de Grafo\n\n"
        f"**{len(notes)} notas** · gerado em `{data['generated'][:10]}`"
    )
    return ()


@app.cell
def _(notes):
    all_slugs = {n["id"] for n in notes}
    inverse_index: dict[str, list[str]] = {n["id"]: [] for n in notes}
    for _n in notes:
        for _link in _n.get("links", []):
            if _link in inverse_index:
                inverse_index[_link].append(_n["id"])
    return all_slugs, inverse_index


@app.cell
def _(inverse_index, mo, notes):
    import pandas as pd

    _orphans = [
        n for n in notes
        if not n.get("links") and not inverse_index.get(n["id"])
    ]
    mo.md(f"## 🏝️ Notas Órfãs\n\n{len(_orphans)} notas sem links de entrada ou saída.")
    return (pd,)


@app.cell
def _(inverse_index, mo, notes, pd):
    _orphans = [
        {"id": n["id"], "title": n["title"], "folder": n["folder"], "status": n.get("status")}
        for n in notes
        if not n.get("links") and not inverse_index.get(n["id"])
    ]
    mo.ui.table(pd.DataFrame(_orphans)) if _orphans else mo.md("_Nenhuma nota órfã._")
    return ()


@app.cell
def _(all_slugs, mo, notes):
    import pandas as _pd2

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if link not in all_slugs
    ]
    mo.md(f"## 🔗 Links Quebrados\n\n{len(_broken)} links apontam para notas inexistentes no vault.")
    return ()


@app.cell
def _(all_slugs, mo, notes):
    import pandas as _pd3

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if link not in all_slugs
    ]
    mo.ui.table(_pd3.DataFrame(_broken)) if _broken else mo.md("_Nenhum link quebrado._")
    return ()


@app.cell
def _(mo, notes):
    import altair as alt
    import pandas as _pd4
    from collections import Counter

    _folder_notes = Counter(n["folder"] for n in notes)
    _folder_links = Counter(n["folder"] for n in notes for _ in n.get("links", []))
    _density = [
        {
            "pasta": folder,
            "notas": count,
            "links_saida": _folder_links.get(folder, 0),
            "densidade": round(_folder_links.get(folder, 0) / count, 2),
        }
        for folder, count in _folder_notes.items()
    ]
    _df = _pd4.DataFrame(_density)
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("densidade:Q", title="Links por nota"),
            y=alt.Y("pasta:N", sort="-x", title="Pasta"),
            tooltip=["pasta:N", "notas:Q", "links_saida:Q", "densidade:Q"],
        )
        .properties(title="Densidade de Links por Pasta", height=250)
    )
    mo.ui.altair_chart(_chart)
    return Counter, alt


@app.cell
def _(inverse_index, mo, notes):
    import pandas as _pd5

    _top = sorted(
        [{"nota": n["id"], "titulo": n["title"], "inbound": len(inverse_index.get(n["id"], []))}
         for n in notes],
        key=lambda x: x["inbound"],
        reverse=True,
    )[:10]
    mo.md("## ⭐ Top 10 Mais Referenciadas")
    mo.ui.table(_pd5.DataFrame(_top))
    return ()


if __name__ == "__main__":
    app.run()
```

- [ ] **Step 2: Verificar sintaxe**

```bash
python3 -c "
import ast
src = open('99 - Meta e Anexos/Notebooks/analise-grafo.py').read()
ast.parse(src)
print('OK: sintaxe valida')
" || python -c "
import ast
src = open('99 - Meta e Anexos/Notebooks/analise-grafo.py').read()
ast.parse(src)
print('OK: sintaxe valida')
"
```

Expected: `OK: sintaxe valida`

- [ ] **Step 3: Commit**

```bash
git add "99 - Meta e Anexos/Notebooks/analise-grafo.py"
git commit -m "feat(notebooks): add graph health analysis notebook"
```

---

### Task 5: Starters `revisao-diaria.py` e `explorador.py`

**Files:**
- Create: `99 - Meta e Anexos/Notebooks/starters/revisao-diaria.py`
- Create: `99 - Meta e Anexos/Notebooks/starters/explorador.py`

- [ ] **Step 1: Criar diretório e `revisao-diaria.py`**

```bash
mkdir -p "99 - Meta e Anexos/Notebooks/starters"
```

```python
import marimo

app = marimo.App(width="medium", title="Revisão Diária")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    from datetime import date
    return date, json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore
        data = json.loads(open_url("../vault-data.json").read())
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "analysis", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(date, mo, notes):
    today = date.today().isoformat()
    _today_notes = [
        n for n in notes
        if (n.get("created") or "")[:10] == today
        or (n.get("updated") or "")[:10] == today
    ]
    _inbox = [n for n in notes if "00 -" in n.get("folder", "")]
    _drafts = [n for n in notes if n.get("status") == "draft"]

    mo.md(
        f"# ☀️ Revisão Diária — {today}\n\n"
        f"- 📥 **{len(_inbox)} notas** em `00 - Entrada`\n"
        f"- ✏️ **{len(_drafts)} drafts** pendentes\n"
        f"- 📝 **{len(_today_notes)} notas** criadas ou atualizadas hoje"
    )
    return (today,)


@app.cell
def _(mo, notes, today):
    import pandas as pd

    _today_notes = [
        {"titulo": n["title"], "pasta": n["folder"], "status": n.get("status")}
        for n in notes
        if (n.get("created") or "")[:10] == today
        or (n.get("updated") or "")[:10] == today
    ]
    mo.md("## Notas de Hoje")
    mo.ui.table(pd.DataFrame(_today_notes)) if _today_notes else mo.md("_Nenhuma nota criada ou atualizada hoje._")
    return (pd,)


@app.cell
def _(mo, notes, pd):
    _inbox = [
        {"titulo": n["title"], "id": n["id"], "status": n.get("status")}
        for n in notes if "00 -" in n.get("folder", "")
    ]
    mo.md("## 📥 Entrada")
    mo.ui.table(pd.DataFrame(_inbox)) if _inbox else mo.md("_Entrada vazia._")
    return ()


if __name__ == "__main__":
    app.run()
```

Nota: em WASM os starters buscam `"../vault-data.json"` (um nível acima de `starters/` no export). Para uso local, `os.getcwd()` aponta para a raiz do repo onde `public/analysis/vault-data.json` existe.

- [ ] **Step 2: Criar `explorador.py`**

```python
import marimo

app = marimo.App(width="medium", title="Explorador do Vault")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    return json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore
        data = json.loads(open_url("../vault-data.json").read())
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "analysis", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(mo, notes):
    _folders = sorted({n["folder"] for n in notes})
    _all_tags = sorted({tag for n in notes for tag in n.get("tags", [])})

    folder_sel = mo.ui.dropdown(options=["Todas"] + _folders, value="Todas", label="Pasta")
    tags_sel = mo.ui.multiselect(options=_all_tags, label="Tags (qualquer)")
    status_sel = mo.ui.radio(
        options=["Todas", "published", "draft", "sem status"],
        value="Todas",
        label="Status",
    )
    mo.hstack([folder_sel, status_sel])
    return folder_sel, status_sel, tags_sel


@app.cell
def _(mo, tags_sel):
    mo.vstack([tags_sel])
    return ()


@app.cell
def _(folder_sel, mo, notes, status_sel, tags_sel):
    import pandas as pd

    def _matches(n: dict) -> bool:
        if folder_sel.value != "Todas" and n["folder"] != folder_sel.value:
            return False
        if status_sel.value != "Todas":
            if status_sel.value == "sem status" and n.get("status") is not None:
                return False
            if status_sel.value in ("published", "draft") and n.get("status") != status_sel.value:
                return False
        if tags_sel.value and not any(t in n.get("tags", []) for t in tags_sel.value):
            return False
        return True

    _filtered = [n for n in notes if _matches(n)]
    _df = pd.DataFrame(
        [{"título": n["title"], "pasta": n["folder"], "status": n.get("status") or "—", "tags": ", ".join(n.get("tags", []))}
         for n in _filtered]
    )
    mo.md(f"**{len(_filtered)} notas** encontradas")
    mo.ui.table(_df)
    return (pd,)


if __name__ == "__main__":
    app.run()
```

- [ ] **Step 3: Verificar sintaxe dos dois arquivos**

```bash
for f in "99 - Meta e Anexos/Notebooks/starters/revisao-diaria.py" \
         "99 - Meta e Anexos/Notebooks/starters/explorador.py"; do
  python3 -c "import ast; ast.parse(open('$f').read()); print('OK: $f')" 2>/dev/null \
  || python -c "import ast; ast.parse(open('$f').read()); print('OK: $f')"
done
```

Expected: `OK: ...revisao-diaria.py` e `OK: ...explorador.py`

- [ ] **Step 4: Commit**

```bash
git add "99 - Meta e Anexos/Notebooks/starters/"
git commit -m "feat(notebooks): add daily review and explorer starter notebooks"
```

---

### Task 6: Página de índice `/analysis/index.astro`

**Files:**
- Create: `.site/pages/analysis/index.astro`

- [ ] **Step 1: Criar `.site/pages/analysis/index.astro`**

```astro
---
// sem imports — página HTML pura, não usa componentes Starlight
---
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Análise do Vault</title>
  </head>
  <body>
    <main style="max-width:900px;margin:2rem auto;padding:0 1rem;font-family:system-ui">
      <h1>🔍 Análise do Vault</h1>
      <p>Notebooks interativos Marimo para explorar a saúde do seu vault.</p>
      <ul style="line-height:2">
        <li>
          <a href="./publishing.html">
            📊 <strong>Publicação</strong> — status das notas, tags e distribuição por pasta
          </a>
        </li>
        <li>
          <a href="./graph.html">
            🕸️ <strong>Grafo</strong> — notas órfãs, links quebrados, densidade por pasta
          </a>
        </li>
      </ul>
      <hr />
      <p style="color:#888;font-size:.9rem">
        Notebooks gerados com <a href="https://marimo.io">Marimo</a>.
        Os dados são um snapshot do momento do último deploy.
      </p>
    </main>
  </body>
</html>
```

Nota: usamos HTML puro em vez de componentes Starlight para evitar acoplamento à versão do tema e porque `/analysis/` hospeda páginas externas (HTML Marimo), não conteúdo Starlight. O `srcDir: '.site'` do Astro inclui este arquivo no build como `/analysis/index.html`.

- [ ] **Step 2: Verificar que o arquivo é HTML válido (apenas sintaxe)**

```bash
cat ".site/pages/analysis/index.astro" | head -5
```

Expected: começa com `---` (frontmatter Astro vazio implícito) ou `<html`.

- [ ] **Step 3: Commit**

```bash
git add ".site/pages/analysis/index.astro"
git commit -m "feat(site): add /analysis/ index page"
```

---

### Task 7: Devcontainer + script `notebooks:dev`

**Files:**
- Modify: `.devcontainer/post-create.sh`
- Modify: `.devcontainer/devcontainer.json`
- Modify: `package.json`

- [ ] **Step 1: Atualizar `.devcontainer/post-create.sh` — adicionar pip install**

Localizar a seção que instala o Pi agent (procurar por `pi-coding-agent`). Adicionar **antes** do bloco `# vault:`:

```bash
# Python deps — Marimo e libs de análise
uv pip install -r requirements.txt \
  || echo "[aviso] pip install falhou. Execute: uv pip install -r requirements.txt"
```

- [ ] **Step 2: Atualizar o readiness gate em `post-create.sh`**

Localizar o bloco `echo "=== Ambiente pronto ==="`. Adicionar `marimo` após a linha do `uv`:

```bash
echo "marimo  : $(marimo --version 2>/dev/null || echo 'não instalado')"
```

O bloco ficará:
```bash
echo "=== Ambiente pronto ==="
echo "Node.js : $(node -v)"
echo "pnpm    : $(pnpm --version)"
echo "uv      : $(uv --version)"
echo "marimo  : $(marimo --version 2>/dev/null || echo 'não instalado')"
echo "Pi      : $(pi --version 2>/dev/null || echo 'não instalado')"
echo "======================="
```

- [ ] **Step 3: Adicionar `forwardPorts` ao `devcontainer.json`**

Adicionar após a chave `"postStartCommand"` (ou após qualquer campo de nível raiz):

```json
"forwardPorts": [2718],
```

Porta 2718 é o padrão do Marimo. O VS Code fará port forwarding automático ao abrir o devcontainer.

- [ ] **Step 4: Adicionar script `notebooks:dev` ao `package.json`**

No objeto `"scripts"`, adicionar após os scripts existentes:

```json
"notebooks:dev": "marimo edit \"99 - Meta e Anexos/Notebooks\""
```

- [ ] **Step 5: Verificar JSON do devcontainer**

```bash
node -e "JSON.parse(require('fs').readFileSync('.devcontainer/devcontainer.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add .devcontainer/post-create.sh .devcontainer/devcontainer.json package.json
git commit -m "feat(devcontainer): add marimo install and port forwarding"
```

---

### Task 8: Dependabot — ecosystem pip

**Files:**
- Modify or create: `.github/dependabot.yml`

- [ ] **Step 1: Verificar se `.github/dependabot.yml` já existe**

```bash
test -f .github/dependabot.yml && echo "EXISTE" || echo "NAO_EXISTE"
```

- [ ] **Step 2a: Se EXISTE — adicionar bloco pip ao final do array `updates`**

Abrir `.github/dependabot.yml` e adicionar ao final do array `updates` (após o último item):

```yaml
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      python-deps:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps):"
    labels:
      - "dependencies"
      - "automação"
```

- [ ] **Step 2b: Se NAO_EXISTE — criar o arquivo completo com pip**

```yaml
version: 2

updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      python-deps:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps):"
    labels:
      - "dependencies"
      - "automação"
```

Nota: o plano `2026-05-19-ci-hardening-dependabot-e-audit-moderado.md` adiciona os ecosystems `npm` e `github-actions`. Se ambos os planos forem executados, o arquivo final terá os três ecosystems.

- [ ] **Step 3: Verificar YAML válido**

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
yaml.load(fs.readFileSync('.github/dependabot.yml','utf8'));
console.log('OK');
" 2>/dev/null || python3 -c "
import yaml
yaml.safe_load(open('.github/dependabot.yml').read())
print('OK')
" || python -c "
import yaml
yaml.safe_load(open('.github/dependabot.yml').read())
print('OK')
"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore(ci): add pip ecosystem to Dependabot"
```

---

### Task 9: `deploy-site.yml` — export de notebooks

**Files:**
- Modify: `.github/workflows/deploy-site.yml`

- [ ] **Step 1: Adicionar path triggers**

Localizar o bloco `paths:` dentro de `on.push`. Adicionar após os paths existentes do vault:

```yaml
      - "99 - Meta e Anexos/Notebooks/**"
      - "requirements.txt"
```

- [ ] **Step 2: Adicionar steps de Python após o build do Astro**

Localizar o step `- name: Build site` (que executa `pnpm run site:build`). Adicionar os dois steps **após** ele, **antes** do step `actions/upload-pages-artifact`:

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

O `vault-data.json` já está em `dist/analysis/` neste ponto — o Astro build copiou de `public/analysis/` para `dist/analysis/` automaticamente.

- [ ] **Step 3: Verificar YAML válido**

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
yaml.load(fs.readFileSync('.github/workflows/deploy-site.yml','utf8'));
console.log('OK');
"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-site.yml
git commit -m "feat(ci): add marimo notebook export to deploy-site workflow"
```

---

### Task 10: Validation gate

**Files:** (nenhum arquivo novo — verificação)

- [ ] **Step 1: Verificar `requirements.txt` tem exatamente 3 linhas pinadas**

```bash
cat requirements.txt
wc -l < requirements.txt
```

Expected: 3 linhas, todas com `==` (sem `^`, `~`, `>=`).

- [ ] **Step 2: Build Astro — verificar geração do `vault-data.json`**

```bash
pnpm run site:build 2>&1 | tail -10
```

Expected: linha contendo `vault-data.json:` com contagem de notas, sem erros TypeScript.

```bash
node -e "
const d = require('./public/analysis/vault-data.json');
console.log('notas:', d.notes.length);
console.log('campos:', Object.keys(d.notes[0]).join(', '));
console.log('gerado:', d.generated);
"
```

Expected: `notas: <N>` (N > 0), `campos: id, title, folder, status, tags, links, created, updated`

- [ ] **Step 3: Verificar sintaxe de todos os notebooks**

```bash
for f in \
  "99 - Meta e Anexos/Notebooks/analise-publicacao.py" \
  "99 - Meta e Anexos/Notebooks/analise-grafo.py" \
  "99 - Meta e Anexos/Notebooks/starters/revisao-diaria.py" \
  "99 - Meta e Anexos/Notebooks/starters/explorador.py"; do
  python3 -c "import ast; ast.parse(open('$f').read()); print('OK: $f')" 2>/dev/null \
  || python -c "import ast; ast.parse(open('$f').read()); print('OK: $f')"
done
```

Expected: 4 linhas `OK: ...`

- [ ] **Step 4: Verificar YAML dos workflows**

```bash
for f in .github/workflows/deploy-site.yml .github/dependabot.yml; do
  node -e "require('js-yaml').load(require('fs').readFileSync('$f','utf8')); console.log('OK: $f')"
done
```

Expected: `OK: deploy-site.yml`, `OK: dependabot.yml`

- [ ] **Step 5: Suite de validação existente ainda passa**

```bash
pnpm run validate
```

Expected: PASS — lint, testes e smoke template continuam verdes.

- [ ] **Step 6: (Se Marimo instalado localmente) Export smoke test**

Se `marimo` estiver disponível no ambiente atual:

```bash
mkdir -p dist/analysis
marimo export html-wasm \
  "99 - Meta e Anexos/Notebooks/analise-publicacao.py" \
  --output dist/analysis/publishing.html
ls -lh dist/analysis/
```

Expected: `publishing.html` com tamanho > 100KB (inclui WASM bundle).

Se Marimo não estiver disponível, este step é verificado pela primeira execução do CI após o merge.

- [ ] **Step 7: Commit final de validação**

```bash
git add -p  # confirmar que não há mudanças não intencionais
git status  # deve mostrar working tree clean
```

Se status limpo: nenhum commit necessário. Se houver ajustes dos steps anteriores:

```bash
git add <arquivos-ajustados>
git commit -m "fix(notebooks): validation gate corrections"
```

# Trilha: Lab de notebooks

> **Quando usar:** ao explorar o Lab pela primeira vez, ao validar `dgk lab` após mudanças nos
> notebooks ou no runtime, ou como guia para usuários que querem entender o ciclo
> WASM → local → CI.
>
> **Tempo estimado:** 20–30 min (trilha completa). Só WASM: 5 min.
>
> **Pré-requisito:** `pnpm install` e `dgk etl` executados. Para trilhas locais: `uv` instalado
> e `uv sync` concluído. Para `dgk lab curate`: chave `ANTHROPIC_API_KEY` em `~/.dgk/silo.json`.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `dgk lab evaluate` executa sem nota e imprime ajuda | `lab.test.js` |
| `dgk lab evaluate` com nota imprime score e dimensões | `lab.test.js` |
| `avaliar_textos` retorna scores 0–10 por dimensão | `test_avaliar_textos.py` (24 testes) |
| `avaliar_textos` trata texto vazio, apenas pontuação, keywords obrigatórias | `test_avaliar_textos.py` |
| Notebooks exportados têm helpers de runtime injetados | `notebook_export_runtime_helpers.test.mjs` |
| Notebooks não têm células com output `None` visível | `notebook_cell_output_lint.test.mjs` |
| Path de cada notebook no registry bate com arquivo real | `notebook_path.test.cjs` |
| `dgk lab export` produz HTML em `public/lab/` | `lab.test.js` |
| `dgk lab list` lista notebooks disponíveis | `lab.test.js` |

---

## Trilha A — Explorar no browser (WASM, sem instalação)

A versão WASM roda diretamente no browser, sem Python local.

### A1. Abrir o site com Lab publicado

```bash
pnpm run site:dev:lab   # build + dev server com notebooks exportados
```

Navegar para `http://localhost:4321/lab/`.

| # | O que verificar | Esperado |
|---|---|---|
| W1 | Página `/lab/` carrega | Sidebar com lista de notebooks |
| W2 | Clicar em `analise-feeds` | Notebook abre; spinner de "Iniciando Python..." aparece |
| W3 | Após ~5–15s (WASM carregando) | Célula executada; visualização Altair renderizada |
| W4 | Dropdown de canal funciona | Alterar o canal muda o gráfico |
| W5 | `read_lab_dataset` na barra de status | Sem erro de "arquivo não encontrado" — dataset embutido |

**Por que manual:** o carregamento do runtime Pyodide em ambiente WASM depende de rede/cache do browser e da versão do Pyodide compilado — Playwright não cobre o comportamento completo de isolamento do worker.

---

### A2. Notebooks com 3 blocos visuais

Abrir qualquer notebook no browser e verificar a estrutura:

| # | Bloco | O que verificar |
|---|---|---|
| V1 | "O que você vê agora" | Célula WASM executa sem erro; gráfico aparece |
| V2 | "O que você pode fazer localmente" | Célula mostra instruções de `uv run` ou `dgk lab` |
| V3 | "O que a CI faz por você" | Célula descreve o job CI correspondente |

---

## Trilha B — Abrir notebook local (Marimo interativo)

### B1. Listar notebooks disponíveis

```bash
dgk lab
```

| # | O que verificar | Esperado |
|---|---|---|
| L1 | Ajuda imprime os notebooks disponíveis | Seção "Notebooks disponíveis:" com um por linha (`analise-feeds`, `analise-outbox`, etc.) |
| L2 | `_lab_notebook_runtime.py` não aparece | Arquivo de runtime privado filtrado da lista |

---

### B2. Abrir um notebook

```bash
dgk lab analise-feeds
```

| # | O que verificar | Esperado |
|---|---|---|
| M1 | Marimo inicia e abre o browser | URL `http://localhost:2718` (ou porta disponível) |
| M2 | Células executam sem erro | Gráfico Altair renderizado com dados reais de `dados/lab/` |
| M3 | Dropdown de canal interativo | Mudar canal re-executa apenas as células dependentes |
| M4 | `Ctrl+C` no terminal | Marimo encerra; browser mostra "servidor encerrado" |

**Verificação de dados antes de abrir:**

```bash
node -e "const d=require('./dados/lab/perfil-do-vault.json'); console.log('vault:', d.name, '| notas:', d.totalNotes)"
```

---

### B3. Notebook de outbox

```bash
dgk lab analise-outbox
```

| # | O que verificar | Esperado |
|---|---|---|
| O1 | Tabela de itens do outbox renderiza | Colunas: título, status, canais, data |
| O2 | Thread preview expande | Preview do texto que seria publicado no canal |
| O3 | Caption do Instagram | Truncado em 2200 chars + hashtags do frontmatter |
| O4 | Checklist de pre-publicação | Itens com checkbox interativo |

---

## Trilha C — Avaliar qualidade de escrita

### C1. Avaliar uma nota

```bash
dgk lab evaluate
```

| # | O que verificar | Esperado |
|---|---|---|
| E1 | Sem argumento | Lista notas do vault disponíveis para avaliação |
| E2 | `dgk lab evaluate "Bem-vindo ao seu vault"` | Score geral (0–10) + dimensões: clareza, coesão, vocabulário |
| E3 | Score e dimensões impressos | Nenhuma exceção Python; output legível no terminal |
| E4 | Nota inexistente | Mensagem de erro clara com sugestão |

**Dimensões avaliadas (determinístico, sem API):**
- Clareza de linguagem
- Coesão textual
- Diversidade de vocabulário
- Uso de listas e formatação
- Presença de frontmatter obrigatório

---

### C2. Avaliar com nota de baixa qualidade

Criar uma nota de teste com texto pobre:

```bash
cat > "00 - Entrada/nota-ruim.md" << 'EOF'
---
title: Teste
status: draft
---
ok ok ok. isso. sim. ok.
EOF
dgk lab evaluate "00 - Entrada/nota-ruim.md"
```

| # | O que verificar | Esperado |
|---|---|---|
| Q1 | Score abaixo de 5 | Nota recebe avaliação baixa em vocabulário e coesão |
| Q2 | Dimensões detalhadas impressas | Cada dimensão tem score individual |

---

## Trilha D — Curadoria de feeds com IA

> Requer `ANTHROPIC_API_KEY` configurada. Consultar `dgk sow` para salvar a chave se necessário.

```bash
dgk lab curate
```

| # | O que verificar | Esperado |
|---|---|---|
| AI1 | Sem chave configurada | Mensagem de erro clara: "ANTHROPIC_API_KEY não encontrada" |
| AI2 | Com chave válida | Classificação de feeds imprime categorias sugeridas |
| AI3 | `--dry-run` (se disponível) | Mostra classificações sem sobrescrever dados |
| AI4 | Saída tem `categoria` por item do feed | JSON ou tabela com classificação |

**Verificar dados após curadoria:**

```bash
node -e "const d=require('./dados/lab/feeds-curados.json'); console.log('items:', d.items?.length)"
```

---

## Trilha E — Exportar notebooks para HTML

### E1. Export local

```bash
dgk lab export
```

| # | O que verificar | Esperado |
|---|---|---|
| X1 | Arquivos HTML gerados em `public/lab/` | Um `.html` por notebook |
| X2 | HTML tem helpers de runtime | `fetch_local_url_text`, `read_lab_dataset` presentes no bundle |
| X3 | Abrir o HTML diretamente no browser | Notebook carrega; não requer servidor |
| X4 | Tamanho dos arquivos | Cada HTML < 5 MB (bundle WASM não inlineado) |

---

### E2. Export para publicação

```bash
pnpm run notebooks:export:public
```

| # | O que verificar | Esperado |
|---|---|---|
| P1 | Assets em `public/lab/` atualizados | Timestamp de modificação recente |
| P2 | `pnpm run site:build` após export | Build passa sem erro de assets faltando |
| P3 | `/lab/` no site de preview | Notebooks renderizam via WASM no browser |

---

## Smoke check rápido

```bash
# Verificar que os datasets estão presentes e parseable
node -e "
['perfil-do-vault','outbox-publicacao','feeds-do-vault','grafo-do-vault-jsonld'].forEach(f=>{
  try { require(\`./dados/lab/\${f}.json\`); console.log('✓', f) }
  catch(e) { console.log('✗', f, e.message) }
})"
```

Esperado: `✓` para todos os datasets. Se algum falhar, rodar `dgk etl` primeiro.

---

## Referência rápida de comandos

<!-- {=dgk-lab-subcommands} -->
| Subcomando | Descrição |
|---|---|
| `dgk lab <notebook>` | Abre notebook no Marimo (ex: `analise-feeds`) |
| `dgk lab evaluate [nota]` | Avalia qualidade de escrita (determinístico, sem API) |
| `dgk lab curate` | Classifica feeds com IA (requer chave de LLM via `dgk sow`) |
| `dgk lab export` | Exporta notebooks para HTML empacotado |
<!-- {/dgk-lab-subcommands} -->

---

## Como reportar falhas

Criar issue com:
- Versão do Python (`uv run python --version`) e do Node.
- Saída completa do comando que falhou.
- Se é falha no WASM (browser) ou local (terminal), especificar qual.
- Para `dgk lab evaluate`: conteúdo da nota avaliada (ou trecho relevante).
- Para WASM: console do browser (F12), incluindo erros de rede ou Pyodide.

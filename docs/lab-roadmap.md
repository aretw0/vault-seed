---
title: Lab Roadmap — Notebooks e Outbox Multi-canal
status: em andamento
updated: 2026-06-14
---

# Lab Roadmap

Documento de trabalho cross-sessão para o Lab e o sistema de outbox
multi-canal do vault-seed.

---

## Contexto e tese central

Uma nota do vault pode ser uma unidade de publicação para múltiplos canais ao
mesmo tempo. O frontmatter controla o destino: site, RSS, Instagram, newsletter,
Mastodon, Bluesky, LinkedIn, GitHub — ou qualquer combinação. O Lab demonstra
esse fluxo com notebooks progressivos (WASM → local → CI/cloud).

---

## Status das correções já entregues (v0.3.1)

- [x] Células invisíveis nos notebooks (marimo last-expression rule)
- [x] `app._unparsable_cell` no WASM (wildcard import removido do helper injetado)
- [x] `pnpm ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` no CI do usuário
      → `pnpm-workspace.yaml` com `policies.minimumReleaseAge.severity: warn`
- [x] Warning de deprecação do Astro (`markdown.remarkPlugins`)
      → migrado para `markdown.processor: unified({...})`
- [x] Pasta legada `Attachments/` removida do git
- [x] Smoke tests para configuração de anexos e presença do lint test

---

## Fase 1 — Base (próxima sessão)

### 1.1 Runtime WASM async HTTP
- [ ] Adicionar `fetch_wasm_json(url)` ao `_lab_notebook_runtime.py`
      usando `pyodide.http.pyfetch` (async, funciona no worker WASM)
- [ ] Adicionar `fetch_wasm_feed(url)` — busca e parseia RSS/Atom no browser
      (apenas URLs CORS-ok: RSS públicos, APIs abertas)
- [ ] Adicionar `fetch_wasm_json` e `fetch_wasm_feed` à lista `LAB_RUNTIME_HELPER_EXPORT_NAMES`
      em `notebook_export_runtime_helpers.mjs`
- [ ] Testes unitários no `notebook_export_runtime_helpers.test.mjs`

### 1.2 Dados de exemplo mais ricos

#### feeds.opml — 12 feeds públicos reais
- [ ] Adicionar feeds: GitHub blog, Hacker News (RSS), Simon Willison,
      Cassidy Williams, Julia Evans, Thoughtbot, CSS-Tricks, Lobsters,
      Astro blog, Marimo blog, The Morning Paper, Segurança digital BR
- [ ] Regenerar `dados/lab/feeds-assinados.json` com `pnpm run feeds:opml`
- [ ] Commitar dados atualizados

#### outbox-publicação — itens realistas
- [ ] Criar 3-5 notas de exemplo com frontmatter de publicação real
      (audiences, channels, status, canonical_url etc.)
- [ ] Incluir exemplos com canal `site: true`, `instagram: true`, `newsletter: true`
- [ ] Regenerar com `pnpm run outbox:prepare`

### 1.3 Workflow CI: refresh automático de dados
- [ ] Criar `.github/workflows/refresh-lab-data.yml`
  - Trigger: `schedule` (diário) + `workflow_dispatch`
  - Steps: `pnpm run notebooks:etl` → commit `dados/lab/*.json` de volta
  - Usa `github.actor` para o commit identity
  - Condição: só commita se houver diff em `dados/lab/`
  - Dispara `deploy-site.yml` via `workflow_run` ou `repository_dispatch`
- [ ] Adicionar `VAULT_ETL_TOKEN` como secret de doc (PAT para push)
- [ ] Smoke test: workflow deve completar sem erro no repo de teste

---

## Fase 2 — Notebooks reescritos

### 2.1 `analise-feeds.py` — 3 blocos progressivos
```
Bloco WASM   → mostra subscrições do bundle + busca itens ao vivo de 1 feed público
Bloco Local  → busca todos os feeds assinados, analisa itens, conta por domínio/tag
Bloco CI     → mostra timestamp do último refresh automático + diff de novos itens
```
- [ ] Célula de progressão explícita (tipo "o que este notebook pode fazer em cada modo")
- [ ] Gráfico Altair: itens por feed por semana (timeline)
- [ ] `fetch_wasm_feed` para buscar GitHub blog ao vivo no browser
- [ ] `fetch_local_feed` para buscar todos os feeds em modo local
- [ ] Candidatas para inbox com triagem sugerida

### 2.2 `analise-publicacao.py` — visualizações reais
- [ ] Gráfico Altair: distribuição de status das notas (barra empilhada)
- [ ] Gráfico Altair: evolução de notas ao longo do tempo (linha por mês)
- [ ] Tabela interativa: filtro por pasta/tag/status (mo.ui.dropdown)
- [ ] Métrica de "pronto para publicar" (notas com `status: ready`)

### 2.3 `analise-grafo.py` — análise de conectividade
- [ ] Altair: scatter plot de centralidade vs. número de links (bolhas por pasta)
- [ ] Tabela de "hubs" (notas mais referenciadas)
- [ ] Tabela de "orphans" melhorada (sugestão de link relacionado)
- [ ] Célula local: detectar links quebrados (notas que referenciam slugs inexistentes)

### 2.4 `analise-outbox.py` — multi-canal
- [ ] Tabela por canal: quantas notas estão "prontas" para cada plataforma
- [ ] Bloco de prévia: como a nota apareceria no Instagram (aspect ratio, caption preview)
- [ ] Bloco de prévia: thread formato X/Mastodon (280 chars chunks)
- [ ] Bloco local: chamar API do canal (ex: Instagram Graph API via secret)
- [ ] Checklist de publicação interativo (mo.ui.checkbox por item)

---

## Fase 3 — ETL write-back e soberania

### 3.1 `etl-demo.py` — ciclo completo
- [ ] Célula "Extract" mostra snapshot atual do vault
- [ ] Célula "Transform" filtra notas publicáveis, classifica por canal
- [ ] Célula "Load" local: `write_local_json_snapshot` → `dados/lab/` → commit
- [ ] Célula "CI" explica que o refresh-lab-data.yml repete esse ciclo
- [ ] Demonstração de `get_local_secret` para GitHub API com token

### 3.2 Novo: `analise-leitura.py` — lista de leitura
- [ ] WASM: mostra lista curada pré-empacotada (URLs + metadata)
- [ ] Local: `fetch_local_url_text` para buscar OpenGraph metadata de cada URL
- [ ] Local: `write_local_json_snapshot` para salvar lista enriquecida
- [ ] Candidatas: transformar URLs em notas de leitura no vault

---

## Fase 4 — Integrações externas

### 4.1 Instagram como outbox canal
- [ ] Definir schema de nota para Instagram:
      ```yaml
      channels:
        instagram:
          status: ready
          caption: "..."
          hashtags: [...]
          image: "99 - Meta e Anexos/Anexos/imagem-post.jpg"
      ```
- [ ] `analise-outbox.py`: célula de prévia do post (caption + dimensões de imagem)
- [ ] Script/notebook local: publicar via Instagram Graph API
      (requer `instagram_access_token` em secret local)
- [ ] Workflow CI opcional: publicar ao fazer merge de PR com nota marcada `ready`

### 4.2 Thread multi-plataforma
- [ ] Definir schema `thread`:
      ```yaml
      channels:
        mastodon: { status: ready, instance: "fosstodon.org" }
        bluesky:  { status: ready }
        linkedin: { status: draft }
      ```
- [ ] Notebook: dividir nota em thread de 280 chars (Mastodon/Bluesky)
- [ ] Script local: postar via API (requer tokens)

### 4.3 Newsletter
- [ ] Schema: `channels.newsletter: { status: ready, list: "principal" }`
- [ ] Notebook: gerar HTML da newsletter a partir de notas selecionadas
- [ ] Integração com Buttondown/Mailchimp via API (opcional)

### 4.4 LLM-assisted curation
- [ ] Notebook: classifica feed items por relevância usando Claude API
      (WASM com key em `mo.ui.text` temporário; local com `get_local_secret`)
- [ ] Workflow CI com `ANTHROPIC_API_KEY` secret para curadoria automática

---

## Bugs e dívidas técnicas

- [ ] Verificar se `pnpm-workspace.yaml: policies.minimumReleaseAge.severity: warn`
      realmente silencia o exit code (testar em `aretw0/teste` após push do v0.3.1)
- [ ] `analise-grafo.py` e `analise-publicacao.py` ainda usam `try/except` direto
      para carregar dados em vez do `_lab_notebook_runtime` helper —
      unificar para o padrão dos outros notebooks
- [x] Cache de export de notebooks não invalida quando `notebook_export_runtime_helpers.mjs`
      muda (resolvido: adicionado ao `notebookExportDependencies`)
- [x] `apresentacao-vault-seed.py` substituído por 4 notebooks focados em
      `99 - Meta e Anexos/Notebooks/apresentacoes/` — cada um usa `_lab_notebook_runtime`

---

## Princípios de design

1. **Cada notebook tem 3 blocos visuais**: "O que você vê agora" (WASM) →
   "O que você pode fazer localmente" → "O que a CI faz por você"
2. **Dados de exemplo são reais**: feeds reais, notas reais, outbox com itens reais
3. **Todo feature tem teste**: `notebook_cell_output_lint`, `notebook_export_runtime_helpers`,
   `smoke_template`, e contratos em `scripts/*.test.*`
4. **Nenhuma nota fica presa num canal**: o frontmatter decide onde ela vai,
   não o notebook — o notebook apenas audita e executa
5. **Soberania digital visível**: o usuário vê o dado sendo coletado, transformado
   e escrito de volta — sem caixas pretas

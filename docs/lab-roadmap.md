---
title: Lab Roadmap — Notebooks e Outbox Multi-canal
status: em andamento
updated: 2026-06-10
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

## Ecossistema e divisão de responsabilidades

O vault-seed é a **interface de distribuição**: template versionado, Lab de
análise, outbox multi-canal e CLI de orquestração (`dgk-cli`). Ele produz
*distribuições personalizadas* — cada fork/init é uma instância soberana.

O **refarm** é a infraestrutura de identidade e protocolo: microkernel WASM
(Tractor), identidade autodeclarada via Nostr, e CRDT (Loro) para colaboração
offline. O vault-seed converge com refarm a partir da fase 5 (canal Nostr no
outbox, `dgk-lab` como ponto de entrada compartilhado).

O **rcdc5** é a integração empresarial: vault de equipe que raspa IBM ALM/RM em
Markdown. Converge com vault-seed na fase 0.7.x como instância de distribuição
corporativa.

### Vocabulário Tema 3 (Prêmio Serpro)

- **arcabouço modular**: o conjunto vault-seed + refarm + rcdc5 como POC
- **distribuições personalizadas**: vaults inicializados a partir do template
- **soberania de dados**: formato aberto, local-first, sem lock-in de plataforma
- **grafo semântico**: notas + links exportados em JSON-LD com vocabulário `dgk:`
- **orquestrador**: `dgk-cli` que une ETL, exportação e publicação em subcomandos

---

## Entregues

### v0.3.1 — correções de infraestrutura

- [x] Células invisíveis nos notebooks (marimo last-expression rule)
- [x] `app._unparsable_cell` no WASM (wildcard import removido do helper injetado)
- [x] `pnpm ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` no CI do usuário
- [x] Warning de deprecação do Astro (`markdown.remarkPlugins`)
- [x] Pasta legada `Attachments/` removida do git
- [x] Smoke tests para configuração de anexos e presença do lint test

### Fase 1 — Base

- [x] Runtime WASM: `fetch_local_url_text`, `read_lab_dataset`, `write_local_json_snapshot`
- [x] `feeds.opml` com 12 feeds públicos reais
- [x] `outbox-publicação` com notas de exemplo realistas (canal instagram, mastodon, newsletter)
- [x] `.github/workflows/refresh-lab-data.yml` — trigger `schedule` + `workflow_dispatch`

### Fase 2 — Notebooks reescritos

- [x] `analise-feeds.py` — 3 blocos WASM/local/CI com Altair e dropdown interativo
- [x] `analise-outbox.py` — multi-canal com Altair, prévia de thread, checklist, Instagram caption
- [x] `analise-grafo.py` — scatter de centralidade, hubs, órfãs, broken links
- [x] `analise-publicacao.py` — distribuição de status, evolução temporal

### Fase 3 — ETL write-back e soberania

- [x] `etl-demo.py` — ciclo Extract/Transform/Load explicado, `get_local_secret` para GitHub API
- [x] `analise-leitura.py` — lista curada, OpenGraph local, criação de notas no vault
- [x] `perfil-do-vault.json` com `collectedAt` para rastreamento temporal

### Fase 4 — Integrações externas

- [x] `analise-outbox.py`: prévia de caption Instagram (2200 chars) + extração de hashtags
- [x] `publicar-thread.py` — Mastodon API, Bluesky AT Protocol, newsletter HTML, Buttondown
- [x] `curadoria-feeds-ia.py` — notebook com Claude API (haiku), gate de checkbox
- [x] `scripts/curate_feeds_ia.py` — headless CI, `continue-on-error: true`
- [x] `refresh-lab-data.yml` — step de AI curation com `ANTHROPIC_API_KEY` optional
- [x] `defusedxml` substituindo `xml.etree.ElementTree` (XXE safety) em todos os pontos

### dgk-cli (lab subcommands)

- [x] `dgk lab etl` — ETL completo via `pnpm run notebooks:etl`
- [x] `dgk lab open [notebook]` — abre notebook no Marimo (com `root` injetável para testes)
- [x] `dgk lab export` — exporta notebooks para HTML/WASM
- [x] `dgk lab curate` — AI curation via `uv run` + `--with anthropic`
- [x] `dgk lab list` — lista notebooks disponíveis
- [x] `dgk lab note <cmd>` — passa para Obsidian CLI (IPC, requer instância rodando)
- [x] `dgk lab open-vault [nome]` — abre vault no Obsidian via URI scheme (multi-OS)
- [x] `packages/cli/src/launcher.js` — detecta Obsidian em macOS/Windows/Linux
- [x] `dgk setup` — detecta Obsidian e exibe instruções de registro do CLI

### Apresentação e grafo semântico

- [x] `apresentacao-vault-seed.py` — reescrito com padrão 3-tier, vocabulário Tema 3,
      `read_lab_dataset("perfil-do-vault")`, sem "Lane de entendimento"
- [x] `grafo-do-vault.jsonld` — JSON-LD com `@context` `dgk:` + `schema.org`, gerado pelo ETL
- [x] `lab.datasets.json` — entrada `grafo-do-vault-jsonld` registrada e publicada

---

## Fase 5 — Convergência com refarm e Nostr

### 5.1 Canal Nostr no outbox

- [ ] Adicionar `nostr` como canal de saída no frontmatter
      ```yaml
      channels:
        nostr: { status: ready, kind: 30023 }
      ```
- [ ] `publicar-thread.py`: célula de publicação Nostr via WebSocket
      (usa identidade do refarm — `nsec` em `get_local_secret("NOSTR_NSEC")`)
- [ ] `analise-outbox.py`: coluna Nostr na tabela de canais

### 5.2 dgk-lab como ponto de entrada compartilhado

- [ ] Decidir se `dgk lab` vira `dgk` sozinho ou se mantemos o subcomando
      (`dgk lab etl` → `dgk etl`?) — avaliar impacto no rename
- [ ] Avaliar agnosticismo de package manager:
      `dgk lab etl` chama `pnpm run notebooks:etl` — considerar
      chamar `node scripts/lab_etl_demo.mjs` diretamente para remover
      dependência implícita de pnpm como runtime (mantendo pnpm como
      gerenciador de instalação é diferente de requerer pnpm para executar)
- [ ] `packages/lab-runtime` publicado como distribuível no npm para reuso pelo refarm

### 5.3 Testes de contrato para o pipeline de exportação

- [ ] `scripts/generate_vault_data.mjs` — schema test: output tem `notes`, `generated`,
      cada nota tem `id`, `title`, `folder`, `links`
- [ ] `scripts/export_notebooks.mjs` — contract test: helper injection no HTML exportado
      contém `__lab_manifest` e `__lab_dataset_*` conforme consumido pelo Astro

### 5.4 rcdc5 como distribuição empresarial

- [ ] Documentar como rcdc5 é uma instância do template vault-seed
      (para o texto do Tema 3 — sem citar nome do projeto real)
- [ ] Verificar se `initialize.yml` suporta o fluxo de inicialização corporativo

---

## Bugs e dívidas técnicas

- [ ] `analise-grafo.py` e `analise-publicacao.py` ainda usam `try/except` direto
      para carregar dados — unificar para `read_lab_dataset` como os outros notebooks
- [ ] Setup test tem stdout poluído: `detectObsidian()` imprime mensagem de encontrado
      durante testes — considerar separar detecção de output (silent mode)
- [ ] `dgk lab open-vault` lança o vault mas não espera Obsidian abrir completamente
      — adicionar timeout ou flag `--wait` para scripts que dependem do vault aberto

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
6. **Distribuições personalizadas, não instâncias gerenciadas**: o vault do usuário
   é seu, não um serviço controlado pelo template

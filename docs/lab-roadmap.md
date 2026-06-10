---
title: Lab Roadmap — Notebooks, Outbox Multi-canal e Convergência com Refarm
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

### vault-seed — interface e distribuição

Template versionado que produz *distribuições personalizadas*. Cada fork/init
é uma instância soberana com identidade e conteúdo próprios. Fornece:
- Estrutura PARA (Projects, Areas, Resources, Archive)
- Lab interativo (Marimo, 3-tier WASM/Local/CI)
- Outbox multi-canal (site, Mastodon, Bluesky, newsletter, Instagram)
- Orquestrador CLI (`dgk lab etl/open/export/curate/open-vault/note`)
- Grafo semântico exportado em JSON-LD (`dgk:` namespace + schema.org)
- Governança editorial via manifesto `.site/lab.notebooks.json`

**Nome:** vault-seed permanece. O repo é citado diretamente no Prêmio Serpro
Tema 3 (`https://github.com/aretw0/vault-seed`). Renomear quebraria essa
referência. O conceito "lab" já está expresso no subcomando `dgk lab`.

### refarm — infraestrutura de identidade e protocolo

Microkernel WASM (Tractor), identidade autodeclarada via Nostr, CRDT (Loro)
para colaboração offline, contratos WIT para interoperabilidade polyglota.
- Temas 1 e 2 do Prêmio Serpro
- validations/: POCs de WASM+WIT e SQLite (pré-Sprint 1)
- Convergência com vault-seed: canal Nostr no outbox (Fase 5), `dgk-lab`
  como ponto de entrada compartilhado
- **Naming futuro:** quando a convergência ocorrer, avaliar `vault-lab`
  ou `nostr-lab` como denominação do conjunto, não substituição do repo

### rcdc5 — distribuição empresarial

Vault de equipe que raspa IBM ALM/RM em Markdown. Inicializado a partir do
vault-seed (README.md linha 5: referência explícita ao template). É a
"distribuição personalizada" descrita no Tema 3. Converge com vault-seed
na fase 0.7.x como instância de produção corporativa.
- Namespace técnico: RCDCP (`https://schema.rcdcp.dev/v1/`)
- 9 packages (engine, schemas, profiles, cli, rm-types, rm-taxonomy,
  rm-renderer, rm-enrichment, scraper-playwright)
- **READ-ONLY para vault-seed:** qualquer mudança fica no vault-seed;
  rcdc5 puxa como template quando necessário

---

## Prêmio Serpro de Inovação 2026 — 3ª Edição

**Prazo de submissão:** 04/05/2026 – **07/07/2026**

**Status dos textos:**
- [x] Tema 1 (WASM Plugins): texto completo, validado, versão original + sem ID
- [x] Tema 2 (Cidadão Digital): texto completo, validado, versão original + sem ID
- [x] Tema 3 (Caixa de Notas): texto completo, validado, versão original + sem ID

**Falta apenas (operacional, fora do vault-seed):**
- [ ] Conversão Markdown → LibreOffice ODT (6 arquivos: 2 por tema)
- [ ] Exportação ODT → PDF
- [ ] Assinatura digital das Cartas Compromisso
- [ ] Upload no portal (anonymous + original + carta por tema)

### POC Readiness — vault-seed vs. Tema 3

O Tema 3 descreve um "arcabouço modular para gestão soberana do conhecimento"
com as seguintes capacidades. Status atual no vault-seed:

| Capacidade citada no Tema 3 | Status no vault-seed |
| --- | --- |
| Markdown + frontmatter como metadados | ✓ desde o início |
| Organização PARA | ✓ desde o início |
| Maps of Content (MOCs) | ✓ estrutura de notas |
| Versionamento Git com governança | ✓ Conventional Commits + CI |
| Pipeline de ingestão modular | ✓ Lab ETL (4 scripts encadeados) |
| Classificação automática com regras | ✓ `curadoria-feeds-ia.py` (Claude API) |
| Publicação local-first | ✓ Astro/Starlight site |
| Governança editorial (manifesto) | ✓ `lab.notebooks.json` |
| JSON-LD para interoperabilidade semântica | ✓ `grafo-do-vault.jsonld` (adicionado 2026-06-10) |
| Outbox multi-canal | ✓ Mastodon, Bluesky, newsletter, Instagram |
| Orquestrador CLI | ✓ `dgk lab` (7 subcomandos) |
| Obsidian + VS Code/Foam | ✓ `dgk lab open-vault` + `dgk lab note` |

**Conclusão:** vault-seed já cobre todas as capacidades descritas no Tema 3.
O JSON-LD foi o último item faltante — adicionado nesta sessão.

### Vocabulário Tema 3 (para uso em documentação e apresentações)

| Termo técnico | Mapeamento no vault-seed |
| --- | --- |
| arcabouço modular | vault-seed template + packages |
| distribuições personalizadas | instâncias via `initialize.yml` (ex: rcdc5) |
| soberania de dados | local-first, formato aberto, sem lock-in |
| caixa de notas | o vault em si (Markdown + PARA) |
| grafo semântico | `grafo-do-vault.jsonld` |
| ingestão modular | Lab ETL pipeline (`dgk lab etl`) |
| orquestrador | `dgk-cli` (`dgk lab etl/export/curate/...`) |
| governança editorial | `lab.notebooks.json` + CI |
| microkernel para conhecimento | estrutura mínima + módulos opcionais |

### Sobre anonimização (para o texto do trabalho)

O texto anônimo NÃO pode citar:
- "vault-seed" pelo nome
- "rcdc5" pelo nome
- URLs do GitHub (`aretw0/vault-seed`)
- Caminhos internos ou nomes de time

O texto usa termos genéricos:
- "repositório de template" (vault-seed)
- "instância de distribuição" (rcdc5)
- "equipe de desenvolvimento" (time RCDC5)
- "repositório público de referência" (sem URL)

---

## Entregues

### v0.3.x — Base e correções de infraestrutura

- [x] Células invisíveis nos notebooks (marimo last-expression rule)
- [x] `app._unparsable_cell` no WASM
- [x] `pnpm ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` no CI
- [x] Warning de deprecação do Astro
- [x] Pasta legada `Attachments/` removida do git
- [x] Smoke tests para configuração de anexos
- [x] `.github/workflows/refresh-lab-data.yml`

### Fase 1 — Base do Lab

- [x] Runtime WASM: `fetch_local_url_text`, `read_lab_dataset`, `write_local_json_snapshot`
- [x] `feeds.opml` com 12 feeds públicos reais
- [x] Notas de exemplo com frontmatter de publicação real (instagram, mastodon, newsletter)

### Fase 2 — Notebooks reescritos

- [x] `analise-feeds.py` — WASM/local/CI com Altair e dropdown
- [x] `analise-outbox.py` — multi-canal com Altair, thread preview, checklist, Instagram caption
- [x] `analise-grafo.py` — scatter centralidade, hubs, órfãs, broken links
- [x] `analise-publicacao.py` — distribuição de status, evolução temporal

### Fase 3 — ETL write-back e soberania

- [x] `etl-demo.py` — ciclo Extract/Transform/Load, `get_local_secret` para GitHub API
- [x] `analise-leitura.py` — lista curada, OpenGraph local, criação de notas no vault
- [x] `perfil-do-vault.json` com `collectedAt`

### Fase 4 — Integrações externas

- [x] Instagram preview (caption 2200 chars + hashtags do frontmatter)
- [x] `publicar-thread.py` — Mastodon API, Bluesky AT Protocol, newsletter HTML, Buttondown
- [x] `curadoria-feeds-ia.py` — notebook com Claude API (haiku), gate de checkbox
- [x] `scripts/curate_feeds_ia.py` — headless CI, `continue-on-error: true`
- [x] `refresh-lab-data.yml` — step de AI curation com `ANTHROPIC_API_KEY` opcional
- [x] `defusedxml` substituindo `xml.etree.ElementTree` (XXE safety) em todos os pontos

### dgk-cli

- [x] `dgk lab etl` — ETL completo via node direto (sem dependência de pnpm em runtime)
- [x] `dgk lab open [notebook]` — abre notebook no Marimo
- [x] `dgk lab export` — exporta notebooks para HTML/WASM
- [x] `dgk lab curate` — AI curation via `uv run` + `--with anthropic`
- [x] `dgk lab list` — lista notebooks disponíveis
- [x] `dgk lab note <cmd>` — Obsidian CLI com fallback para path direto Win32
- [x] `dgk lab open-vault [nome]` — abre vault no Obsidian via URI scheme
- [x] `packages/cli/src/launcher.js` — detecta Obsidian em macOS/Windows/Linux
- [x] `dgk setup` — detecta Obsidian e exibe instruções de registro
- [x] `findObsidianCli` retorna string de comando (não booleano), fallback Win32

### Apresentação e grafo semântico

- [x] `apresentacao-vault-seed.py` — 3-tier, vocabulário Tema 3, `read_lab_dataset`
- [x] `grafo-do-vault.jsonld` — JSON-LD com `@context` `dgk:` + `schema.org`
- [x] `lab.datasets.json` — entrada `grafo-do-vault-jsonld` registrada e publicada

### Testes de contrato

- [x] 31 testes CLI (comandos, index, launcher, lab — incluindo open-vault e path fallback)
- [x] 9 testes `generate_vault_data` (slugify, schema, writeVaultData path)
- [x] 18 scripts de contrato/validação existentes (prepare_lab_datasets, notebook_export_runtime_helpers, etc.)
- [x] smoke_template.js (40+ regras de integridade do template)

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

### 5.2 Convergência de naming e CLI

- [ ] Após Nostr integration: avaliar `vault-lab` ou `nostr-lab` como nome
      do conjunto conceitual (NÃO renomear o repo vault-seed antes do upload
      do Prêmio Serpro em 07/07/2026)
- [ ] `packages/lab-runtime` publicado no npm para reuso pelo refarm
- [ ] Avaliar `dgk etl` direto (remover nível `lab`) após naming resolvido

### 5.3 Testes de contrato — pipeline de exportação

- [ ] `scripts/export_notebooks.mjs` — contrato: output HTML tem helpers injetados
      e `VAULT_NOTEBOOKS_PATH` é respeitado nos filenames dos assets
- [ ] `scripts/generate_vault_data.mjs` → `writeVaultData` — já coberto (9 testes)

### 5.4 Unificação de notebooks remanescentes

- [ ] `analise-grafo.py` e `analise-publicacao.py` ainda usam `try/except` direto
      para carregar dados — migrar para `read_lab_dataset`

---

## Bugs e dívidas técnicas

- [ ] Setup test tem stdout poluído: `detectObsidian()` imprime durante testes
      — considerar modo silencioso
- [ ] `dgk lab open-vault` lança o vault mas não espera Obsidian abrir completamente
      — adicionar `--wait` para scripts que dependem do vault aberto
- [ ] Verificar se `pnpm-workspace.yaml: policies.minimumReleaseAge.severity: warn`
      realmente silencia o exit code no CI do usuário final

---

## Princípios de design

1. **Cada notebook tem 3 blocos visuais**: "O que você vê agora" (WASM) →
   "O que você pode fazer localmente" → "O que a CI faz por você"
2. **Dados de exemplo são reais**: feeds reais, notas reais, outbox com itens reais
3. **Todo feature tem teste**: `notebook_cell_output_lint`, `notebook_export_runtime_helpers`,
   `smoke_template`, contratos em `scripts/*.test.*` e `packages/cli/test/`
4. **Nenhuma nota fica presa num canal**: o frontmatter decide onde ela vai
5. **Soberania digital visível**: o usuário vê o dado sendo coletado, transformado
   e escrito de volta — sem caixas pretas
6. **Distribuições personalizadas, não instâncias gerenciadas**: o vault do usuário
   é seu, não um serviço controlado pelo template
7. **CLI agnóstico de package manager**: `dgk lab etl` chama `node` diretamente,
   não `pnpm run` — funciona em qualquer ambiente com Node.js

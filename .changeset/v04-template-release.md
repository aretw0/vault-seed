---
"digital-gardening-kit": minor
---

v0.4: CLI publishing pipeline, presentations, notebook contracts and reliability fixes.

## Inicialização

**`initialize.yml`** — protege o branch `main` contra force-push e exclusões e habilita GitHub Pages automaticamente no primeiro push do usuário. Fecha #55 e #56.

## Lab e Notebooks

**Apresentações** — quatro notebooks Marimo de apresentação substituem o antigo `apresentacao-vault-seed.py`. Cada um cobre um aspecto distinto: visão geral, o Lab, fluxo de publicação e integração com agentes de IA. Os slides ficam em `99 - Meta e Anexos/Notebooks/apresentacoes/` com layouts nativos do Marimo (`layout_file`). A página `/lab/` agora separa notebooks analíticos de apresentações em seções distintas.

**Notas de referência** — pasta `99.4 - Apresentações/` com cinco notas publicadas (MOC + uma por apresentação). Tags mapeiam cada nota ao intent correto da sidebar: `meta/onboarding` → "Começar", `meta/lab` → "Explorar", `meta/site` → "Publicar", `meta/agentes` → "Automatizar".

**Contratos dinâmicos de notebook** — `scripts/notebook_cell_output_lint.test.mjs` reescrito sem listas hardcoded: `discoverNotebooks()` descobre automaticamente todos os notebooks em `99 - Meta e Anexos/Notebooks/`, e o contrato de chaves do runtime é derivado diretamente de `_lab_notebook_runtime.py`. Cobertura sobe de 5 para 20 notebooks testados.

**Starters migrados** — `explorador.py` e `revisao-diaria.py` migrados para `_lab_notebook_runtime` (removido inline `try: import pyodide`). Violações de lint corrigidas: células com múltiplos `mo.*()` top-level encapsuladas em `mo.vstack([...])`.

**Runtime helper injection** — fix `SyntaxError: '(' was never closed` em notebooks cujo `marimo.App()` ocupa múltiplas linhas. Rastreamento de profundidade de parênteses localiza corretamente o `)` de fechamento. Testes de regressão adicionados.

## CLI e Publicação

**`dgk sow`** — wizard interativo de credenciais para Telegram. Armazena tokens em `~/.dgk/silo.json` com permissões `0o600`. Verifica credenciais contra a API real antes de salvar. Descobre e persiste contatos do Telegram no primeiro setup. `dgk sow list` mascara valores armazenados. `dgk sow remove` distingue serviço desconhecido de credencial não configurada.

**`dgk serve` — hardening** — import de `dgk-channels/contacts` agora é dinâmico (não quebra em vaults sem o pacote instalado). Verificação de token Telegram via `GET /bot<token>/getMe` antes de persistir. Filtragem de tokens por allowlist explícita por serviço (impede vazamento de variáveis de ambiente não autorizadas).

**`dgk open / note`** — comandos top-level substituindo `dgk lab open` e `dgk lab note`. `dgk open obsidian` abre o vault via URI scheme; `dgk open <nome>` abre notebook Marimo por nome curto.

**`dgk lab`** — exclusivamente pipeline: `etl`, `curate`, `evaluate`, `export`. Comandos de navegação promovidos ao nível raiz.

**Workflow pnpm-free** — `dgk check` e `dgk lint` chamam scripts diretamente via `node`; usuários não precisam conhecer pnpm.

**`dgk setup` cross-platform** — reescrito em JavaScript puro. Sem dependência de `bash`. Funciona no Windows sem Git Bash ou WSL.

## Fixes de Confiabilidade

**Rate limiter** (`dgk-channels`) — recheck de `minDelayMs` após sleep de burst-window. Sem o fix, uma mensagem enviada imediatamente após a janela de burst poderia violar o intervalo mínimo entre envios.

**Inbox do Telegram** — nome de arquivo agora inclui `message_id` como sufixo (`{ts} from telegram--{id}.md`). Impede perda silenciosa de mensagens chegando no mesmo minuto.

**ETL de feeds** (`curate_feeds_ia.py`) — import `urllib.request` restaurado. Ausência causava `NameError` no primeiro ciclo de coleta.

## Extensibilidade

**`@aretw0/dgk-skills`** — pacote Pi-compatível com cinco skills declarativas (`vault-context`, `vault-search`, `vault-read`, `vault-create`, `vault-daily`). Ensina agentes a interagir com o vault via Obsidian CLI. Instalável via `pi install npm:@aretw0/dgk-skills`.

**`dgk publish skill / extension`** — scaffold para novos pacotes de skills Pi e extensões TypeScript com workflow de publicação via tag GitHub Actions.

## CI e Qualidade

**CI** — `test:python` removido do script `validate`; exclusivo do job `test-python` que instala `uv`. Corrige falhas `uv: not found` no runner de validação.

**`smoke_user_vault.mjs`** — lista `RESET_ON_INIT` sincronizada com as novas notas da pasta `99.4 - Apresentações/`. Contrato G detecta notas `published` que escapariam ao usuário sem reset.

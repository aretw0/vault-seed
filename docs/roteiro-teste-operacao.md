# Trilha: Operação diária do vault (dgk check, note, inbox)

> **Quando usar:** ao validar o estado do vault após setup, ao testar o fluxo
> de captura de mensagens do Telegram para o vault, ou como guia para usuários
> que querem entender o dia-a-dia do CLI além da configuração inicial.
>
> **Tempo estimado:** 10–15 min.
>
> **Pré-requisito:** `pnpm install` concluído e ao menos `dgk sow telegram`
> configurado (para as trilhas de inbox).

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `check` chama os 3 scripts de validação em sequência | `check.test.js` |
| `check --json` repassa a flag para os scripts | `check.test.js` |
| `check` imprime status de canais ao final (sem `--json`) | `check.test.js` |
| `inbox telegram` delega para `inbox_from_telegram.mjs` | `inbox.test.js` |
| `inbox` sem canal imprime ajuda (exit 0) | `inbox.test.js` |
| `inbox` com canal desconhecido imprime erro (exit 1) | `inbox.test.js` |
| `note --help` imprime ajuda sem tentar abrir Obsidian | `note.test.js` |
| `note` sem Obsidian CLI imprime dica de setup (exit 1) | `note.test.js` |
| `inboxFromTelegram` não processa update já visto (offset) | `inbox_from_telegram.test.mjs` |
| `inboxFromTelegram` salva updates em `00 - Entrada/` | `inbox_from_telegram.test.mjs` |

---

## Trilha A — `dgk check` (health check do vault)

O `dgk check` é o ponto de entrada para saber se o vault está configurado
corretamente. Ele roda três validações em sequência e, ao final, mostra o
estado dos canais de publicação.

### A1. Executar o check

```bash
dgk check
```

Saída esperada em um vault corretamente configurado:

```
✓ Estrutura do vault validada (validate_onboarding)
✓ Arquitetura de informação OK (audit_information_architecture)
✓ Textos em português OK (check_pt_text)

Canais de publicação:
  ✓ Telegram
  ○ Mastodon  (configurar com: dgk sow mastodon)
  ○ Bluesky   (configurar com: dgk sow bluesky)
  ○ Buttondown  (configurar com: dgk sow buttondown)
```

| # | Cenário | Esperado |
|---|---|---|
| C1 | Vault íntegro, Telegram configurado | Três `✓` de validação + `✓ Telegram` em canais |
| C2 | Vault sem canais configurados | Validações passam + `Nenhum canal configurado. Use \`dgk sow <canal>\` para começar.` |
| C3 | Arquivo de vault corrompido ou ausente | Erro claro do script responsável + dica de próximo passo |
| C4 | `dgk check --json` | Saída JSON dos scripts; seção de canais omitida |

### A2. Próximo passo natural

`dgk check` é o ponto de diagnóstico, não de configuração. Se um canal
mostrar `○`, a instrução já indica o comando exato:

```bash
dgk sow mastodon   # ou whichever channel
```

Se o check falhar por estrutura do vault, consultar:
`99 - Meta e Anexos/99.1 - Onboarding/`

---

## Trilha B — `dgk inbox telegram` (captura de mensagens)

O `dgk inbox telegram` busca mensagens enviadas ao bot e as salva como notas
em `00 - Entrada/`. É o caminho de entrada de conteúdo via Telegram.

### B1. Pré-condição: enviar mensagem ao bot

No Telegram, envie uma mensagem para o bot configurado em `dgk sow telegram`.
Pode ser texto simples, um link ou uma nota rápida.

### B2. Rodar o inbox

```bash
dgk inbox telegram
```

Saída esperada (primeira execução com mensagens):

```
[inbox] 1 update(s) importado(s) para 00 - Entrada/
```

| # | Cenário | Esperado |
|---|---|---|
| I1 | Mensagens não lidas no bot | Uma nota `.md` criada por mensagem em `00 - Entrada/` |
| I2 | Segunda execução sem novas mensagens | Saída vazia ou `0 updates` — offset avança, sem duplicatas |
| I3 | Mensagem com link | Nota gerada com o link no corpo |
| I4 | `--limit 5` com 10 mensagens pendentes | Apenas 5 notas criadas; offset avança 5 posições |
| I5 | Sem token configurado | Erro claro: `TELEGRAM_BOT_TOKEN não configurado` |

### B3. Verificar as notas geradas

```bash
ls "00 - Entrada/"
```

Cada mensagem vira um arquivo `.md` com frontmatter mínimo:

```yaml
---
title: "Mensagem do Telegram — 2026-06-13"
source: telegram
created: 2026-06-13T05:00:00.000Z
status: draft
---

Conteúdo da mensagem aqui.
```

### B4. Limitar a importação (útil para testes)

```bash
dgk inbox telegram --limit 3
```

Útil para processar mensagens antigas em lotes sem sobrecarregar o vault
com muitas notas de uma vez.

---

## Trilha C — `dgk note` (Obsidian CLI)

`dgk note` é um passthrough para o Obsidian CLI — requer Obsidian 1.12+
com CLI registrado e Obsidian em execução.

> **Por que o CLI do Obsidian?** O Obsidian persiste um índice interno de links,
> tags e backlinks. Criar arquivos `.md` diretamente no sistema de arquivos
> (sem o Obsidian aberto) não atualiza esse índice imediatamente. O CLI do
> Obsidian garante que o app processe a operação e atualize o grafo.

### C1. Verificar se o Obsidian CLI está disponível

```bash
dgk note --help
```

Saída esperada (Obsidian CLI disponível):

```
dgk note <cmd> [args...]

Passa um comando para o Obsidian CLI (requer Obsidian 1.12+ com CLI registrado).
...
```

Se o CLI não estiver registrado, o help ainda imprime mas `dgk note <cmd>` falhará com instrução de como registrar.

### C2. Buscar notas

```bash
dgk note search query="jardim digital"
```

| # | Cenário | Esperado |
|---|---|---|
| N1 | Query com resultados | Lista de notas que mencionam o termo |
| N2 | Obsidian não está em execução | Erro: `Obsidian não está em execução` |
| N3 | Obsidian CLI não registrado | Erro com instrução de setup |

### C3. Ler uma nota

```bash
dgk note read path="40 - Recursos/Jardim digital.md"
```

### C4. Criar uma nota

```bash
dgk note create path="00 - Entrada/teste-cli.md"
```

> **Atenção:** `dgk note create` cria um arquivo vazio no path indicado e
> notifica o Obsidian. Não injeta frontmatter. Para notas com template,
> prefira criar pelo Obsidian com Templater, ou gerar o arquivo `.md`
> manualmente e abrir com `dgk obsidian`.

---

## Trilha D — Fluxo: captura → edição → publicação

Este é o ciclo completo de uma nota que começa como mensagem no Telegram
e termina publicada no site.

```
Telegram → dgk inbox → 00 - Entrada/ → (editar no Obsidian) → dgk etl → dgk outbox
```

### D1. Capturar

```bash
dgk inbox telegram --limit 1
```

### D2. Revisar e promover

Abrir a nota em `00 - Entrada/` e mover para a pasta PARA correta
(`10 - Projetos/`, `20 - Áreas/`, etc.). Atualizar o frontmatter:

```yaml
status: published
publicationStatus: ready
channels:
  - telegram
```

### D3. Indexar

```bash
dgk etl
```

Verifica se a nota aparece no outbox:

```bash
node -e "const d=require('./dados/lab/outbox.json'); console.log(d.items.map(i=>i.title))"
```

### D4. Dry-run antes de publicar

```bash
node scripts/publish_to_telegram.mjs --dry-run
```

Esperado: saída mostrando o que seria enviado, sem chamada real à API.

### D5. Publicar

```bash
node scripts/publish_to_telegram.mjs
```

Ver trilha completa em [`roteiro-teste-outbox.md`](roteiro-teste-outbox.md).

---

## Trilha E — Mesmo ciclo via HTTP (para Pi / agentes externos)

Mesma sequência da Trilha D, mas usando a API do `dgk serve` em vez do CLI.
É o que Pi (agents-lab) faz quando recebe comandos via Telegram.

> **Pré-requisito:** `dgk serve` rodando em segundo plano (`dgk serve &`).

```
Pi recebe /inbox → POST /api/inbox/fetch → notas em 00 - Entrada/
Pi recebe /etl   → POST /api/etl         → outbox atualizado
Pi recebe /pub 2 → POST /api/outbox      → 2 notas publicadas
Pi recebe /check → GET  /api/status      → responde com estado dos canais
```

### E1. Buscar mensagens

```bash
curl -s -X POST http://localhost:4322/api/inbox/fetch \
  -H "Content-Type: application/json" -H "X-Dgk-Admin: 1" \
  -d '{"channel":"telegram","limit":5}'
```

Esperado: `{"ok":true,"output":"5 update(s) importados..."}`.

### E2. Indexar (ETL)

```bash
curl -s -X POST http://localhost:4322/api/etl \
  -H "X-Dgk-Admin: 1"
```

Esperado: `{"ok":true,"output":"..."}` — output capturado dos 4 scripts ETL.

### E3. Verificar o que está na fila

```bash
curl -s http://localhost:4322/api/outbox
```

Esperado: `{"items":[...]}` com notas que têm `publicationStatus: ready`.

### E4. Dry-run

```bash
curl -s -X POST http://localhost:4322/api/outbox \
  -H "Content-Type: application/json" -H "X-Dgk-Admin: 1" \
  -d '{"channel":"telegram","dryRun":true}'
```

### E5. Publicar com limite

```bash
curl -s -X POST http://localhost:4322/api/outbox \
  -H "Content-Type: application/json" -H "X-Dgk-Admin: 1" \
  -d '{"channel":"telegram","limit":1}'
```

### E6. Verificar estado dos canais

```bash
curl -s http://localhost:4322/api/status
```

Esperado: array `channels` com `configured: true` para os canais ativos.
Pi usa essa resposta para formatar uma mensagem de status e responder ao usuário.

**Por que manual:** esta trilha valida a integração end-to-end com servidor real.
Os testes unitários cobrem cada handler isoladamente com spawnFn mockado.

---

## Como reportar falhas

Criar issue com:
- Plataforma e versão do Node.
- Saída completa do comando que falhou.
- Conteúdo de `~/.dgk/silo.json` **com tokens substituídos por `***`**.
- Se é `check`, `inbox` ou `note`, especificar qual.

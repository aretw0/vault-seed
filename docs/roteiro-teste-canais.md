# Trilha: Configurar e validar canais de publicação

> **Quando usar:** antes de publicar qualquer nota pela primeira vez, ao adicionar um novo canal,
> ou como validação pré-release do fluxo de configuração de credenciais.
>
> **Tempo estimado:** 10–15 min por canal.
>
> **Pré-requisito:** `pnpm install` concluído, `dgk setup` executado ao menos uma vez.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `verifyTelegram` retorna `@username (Nome)` com token válido | `sow.test.js` |
| `verifyTelegram` retorna null em token inválido ou falha de rede | `sow.test.js` |
| `discoverTelegramChats` extrai chats de `message`, `channel_post`, `my_chat_member` | `sow.test.js` |
| `chatLabel` formata rótulo com handle e tipo | `sow.test.js` |
| `siloStatus` mascara tokens (apenas 4 chars visíveis) | `silo.test.js` |
| `removeService` apaga chaves corretas sem afetar outros canais | `silo.test.js` |
| `POST /api/sow` salva tokens e faz merge parcial | `serve.test.js` |
| `DELETE /api/sow/:service` remove serviço configurado | `serve.test.js` |
| `GET /api/services` expõe schema sem credentials | `serve.test.js` |

---

## Trilha 0 — Do zero ao primeiro canal configurado

> Use esta trilha se ainda não configurou nenhum canal.
> É o caminho de onboarding que um usuário novo percorre.

### Passo 0.1 — Verificar estado atual

```bash
dgk check
```

Saída esperada ao final (seção de canais):

```
Canais de publicação:
  ○ Mastodon  (configurar com: dgk sow mastodon)
  ○ Bluesky   (configurar com: dgk sow bluesky)
  ○ Buttondown  (configurar com: dgk sow buttondown)
  ○ Telegram  (configurar com: dgk sow telegram)
  Nenhum canal configurado. Use `dgk sow <canal>` para começar.
```

### Passo 0.2 — Preparar o Telegram

Antes de rodar `dgk sow telegram`, você precisa de:

1. Um bot criado pelo `@BotFather` no Telegram (`/newbot`).
2. O token do bot (formato: `123456:ABCdef...`).
3. Uma conversa iniciada com o bot — envie `/start` ou qualquer mensagem para que o bot conheça seu chat.

> O CLI descobrirá o Chat ID automaticamente via `getUpdates`. O passo 3 é o único manual.

### Passo 0.3 — Configurar

```bash
dgk sow telegram
```

Fluxo esperado:

```
Configurar Telegram
  Crie um bot em: https://t.me/BotFather → /newbot → copie o token.
  Depois envie qualquer mensagem ao bot para que o Chat ID seja detectado automaticamente.

Bot Token (de @BotFather): <oculto>

Verificando credenciais... @nomedoBot (Nome do Bot)
✓ Salvo em /home/usuario/.dgk/silo.json

  Buscando chats recentes do bot... 1 encontrado(s):

    [1] Seu Nome — privado  [id: 123456789]

Chat ID (número da lista ou ID manual): 1
  → Seu Nome — privado  [id: 123456789]
```

### Passo 0.4 — Confirmar configuração

```bash
dgk check
```

Saída esperada ao final:

```
Canais de publicação:
  ✓ Telegram
  ○ Mastodon  (configurar com: dgk sow mastodon)
  ○ Bluesky   (configurar com: dgk sow bluesky)
  ○ Buttondown  (configurar com: dgk sow buttondown)
```

Ou via listagem direta:

```bash
dgk sow list
```

---

## Trilha A — Configuração via CLI (caminho primário)

### A1. Configurar Telegram

**O que testar:** bot token válido → descoberta de CHAT_ID via `getUpdates` → save.

```bash
dgk sow telegram
```

| # | O que acontece | Esperado |
|---|---|---|
| C1 | Hint com URL do BotFather aparece antes dos prompts | Texto legível; instrução sobre enviar mensagem ao bot |
| C2 | Após inserir token válido | `Verificando credenciais... @nomedoBot (Nome do Bot)` seguido de `✓ Salvo em ~/.dgk/silo.json` |
| C3 | Após inserir token inválido | `Verificando credenciais... falhou.` + `Credenciais inválidas — token não salvo.` + processo encerra |
| C4 | Prompt de CHAT_ID mostra lista numerada de chats | `[1] Meu Canal (@meucanal) — canal  [id: -100...]` |
| C5 | Inserir número da lista (ex: `1`) | CHAT_ID preenchido automaticamente com o id do chat escolhido |
| C6 | Nenhum chat encontrado | Instrução para enviar mensagem ao bot + prompt de ID manual |
| C7 | Inserir ID manualmente (ex: `-100123456789`) | Aceito sem validação adicional |

**Verificar que foi salvo:**

```bash
dgk sow list
```

Esperado: `✓ Telegram` com as chaves `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` mascaradas.

```bash
dgk check
```

Esperado: `✓ Telegram` na seção "Canais de publicação".

---

### A2. Configurar Mastodon

```bash
dgk sow mastodon
```

| # | O que acontece | Esperado |
|---|---|---|
| M1 | Hint com URL de criação de token aparece | Texto legível antes dos prompts |
| M2 | Instância + Token inseridos e válidos | `Verificando credenciais... @handle@instância` + `✓ Salvo em ~/.dgk/silo.json` |
| M3 | Token inválido | `Verificando credenciais... falhou.` + processo encerra |

---

### A3. Configurar Bluesky

```bash
dgk sow bluesky
```

| # | O que acontece | Esperado |
|---|---|---|
| B1 | Hint com URL de App Passwords aparece | Texto legível antes dos prompts |
| B2 | Handle + App Password válidos | `Verificando credenciais... @handle` + `✓ Salvo em ~/.dgk/silo.json` |
| B3 | Credenciais inválidas | `falhou.` + processo encerra |

---

### A4. Reconfigurar canal existente

```bash
dgk sow telegram
```

Inserir novos valores. Esperado: valores anteriores substituídos. O `silo.json` não deve duplicar chaves — inspecionar com:

```bash
node -e "const s=require(require('node:path').join(require('node:os').homedir(),'.dgk/silo.json')); console.log(Object.keys(s.tokens))"
```

Esperado: cada chave aparece exatamente uma vez.

---

### A5. Remover canal

```bash
dgk sow remove telegram
```

| # | Esperado |
|---|---|
| Remoção executada | `✓ Credenciais de telegram removidas de ~/.dgk/silo.json` |
| `dgk sow list` | `○ Telegram` com `(não configurado)` nas chaves |
| `dgk check` | `○ Telegram  (configurar com: dgk sow telegram)` |

---

## Trilha B — Configuração via admin dashboard

> Requer `dgk serve` ativo (ver `roteiro-teste-admin.md`).
> Abrir `http://localhost:4322` no browser.

| # | Ação | Esperado |
|---|---|---|
| D1 | Clicar em "Configurar" no card do Telegram | Painel de config abre abaixo dos cards |
| D2 | Preencher Bot Token e clicar "Descobrir chats Telegram" | Lista de chats aparece com nome, handle e tipo |
| D3 | Clicar em um chat da lista | Campo Chat ID preenchido automaticamente |
| D4 | Clicar "Salvar" | Painel fecha; card atualiza com `✓` nas chaves |
| D5 | Tentar "Descobrir chats" sem token preenchido | Alerta "Informe o Bot Token primeiro." |
| D6 | Clicar "Remover" no card configurado | Confirmação solicitada; após confirmar, card volta a mostrar `✗` |
| D7 | Clicar "Cancelar" no painel | Painel fecha sem salvar; silo não alterado |

---

## Trilha C — Verificação do estado do silo

```bash
cat ~/.dgk/silo.json
```

Verificar que:

- [ ] Tokens estão presentes como strings.
- [ ] Não há chave de API de LLM (`ANTHROPIC_API_KEY`, `GROQ_API_KEY`) — essas pertencem ao refarm.
- [ ] `updatedAt` foi atualizado.
- [ ] Permissões do arquivo: `chmod 600` (não legível por outros usuários).

```bash
ls -la ~/.dgk/silo.json   # -rw------- esperado em macOS/Linux
```

No Windows, verificar que o arquivo existe em `%USERPROFILE%\.dgk\silo.json`.

---

## Smoke check rápido pós-configuração

```bash
dgk check
```

Esperado: canais configurados aparecem com `✓`; os demais exibem `○` com instrução de como configurar. Nenhum erro de parse do silo.

```bash
dgk sow list
```

Esperado: todos os serviços listados com valores mascarados para os configurados e `(não configurado)` para os demais.

---

## Como reportar falhas

Criar issue com:

- Plataforma (macOS / Windows / Linux) e versão do Node.
- Saída do comando que falhou.
- Conteúdo do `~/.dgk/silo.json` **com tokens substituídos por `***`** antes de colar.
- Se o problema é CLI ou dashboard, especificar qual.

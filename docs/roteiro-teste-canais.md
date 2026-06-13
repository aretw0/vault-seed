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

## Trilha A — Configuração via CLI (caminho primário)

### A1. Configurar Telegram

**O que testar:** bot token válido → descoberta de CHAT_ID via `getUpdates` → save.

```bash
dgk sow telegram
```

| # | O que acontece | Esperado |
|---|---|---|
| C1 | Prompt `Bot Token (de @BotFather)` aparece | Input oculto (sem echo) |
| C2 | Após inserir token válido | Linha `✓ bot verificado: @nomedoBot (Nome do Bot)` |
| C3 | Após inserir token inválido | Linha `✗ bot não verificado — verifique o token` (continua sem travar) |
| C4 | Prompt de CHAT_ID mostra lista numerada de chats | `[1] Meu Canal (@meucanal) — canal [id: -100...]` |
| C5 | Inserir número da lista (ex: `1`) | CHAT_ID preenchido automaticamente |
| C6 | Inserir ID manualmente (ex: `-100123456789`) | Aceito sem validação adicional |
| C7 | Após salvar | `✓ Telegram configurado.` |

**Verificar que foi salvo:**

```bash
dgk check
```

Espera: linha `telegram: ✓` no sumário de canais.

---

### A2. Configurar Mastodon

```bash
dgk sow mastodon
```

| # | O que acontece | Esperado |
|---|---|---|
| M1 | Hint com URL de criação de token aparece | Texto legível antes dos prompts |
| M2 | Instância + Token inseridos | `✓ Mastodon configurado.` |
| M3 | Token inválido aceito sem falha | Aviso exibido, mas configuração prossegue |

---

### A3. Reconfigurar canal existente

```bash
dgk sow telegram
```

Inserir novos valores. Esperado: valores anteriores substituídos. O `silo.json` não deve duplicar chaves.

---

### A4. Remover canal

```bash
dgk sow --remove telegram
```

| # | Esperado |
|---|---|
| Confirmação solicitada | `Remover configuração de Telegram? [s/N]` |
| Após confirmar | `✓ Telegram removido.` |
| `dgk check` | `telegram: ✗` |

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

---

## Smoke check rápido pós-configuração

```bash
dgk check
```

Esperado: todos os canais configurados aparecem com `✓`. Nenhum erro de parse do silo.

---

## Como reportar falhas

Criar issue com:
- Plataforma (macOS / Windows / Linux) e versão do Node.
- Saída do comando com `--verbose` se disponível.
- Conteúdo do `~/.dgk/silo.json` **com tokens mascarados manualmente**.
- Se o problema é CLI ou dashboard, especificar qual.

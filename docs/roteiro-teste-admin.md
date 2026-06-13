# Trilha: Painel admin local (dgk serve)

> **Quando usar:** ao validar o dashboard pela primeira vez, após mudanças no `serve.js`,
> ou como ponto de partida para usuários que preferem UI ao invés de CLI.
>
> **Tempo estimado:** 5–10 min.
>
> **Pré-requisito:** `pnpm install` concluído. Nenhum canal precisa estar configurado — o
> painel funciona também como ponto de entrada para configurar o primeiro canal.

---

## O que está automatizado (não testar manualmente)

| Comportamento | Coberto por |
|---|---|
| `GET /api/status` retorna canais com `configured` e `preview` mascarado | `serve.test.js` |
| `GET /api/services` expõe schema sem credentials | `serve.test.js` |
| `GET /api/outbox` retorna items do JSON do vault | `serve.test.js` |
| `GET /api/contacts` retorna contagens por plataforma | `serve.test.js` |
| `GET /api/rate-limits` retorna histórico por plataforma | `serve.test.js` |
| `POST /api/sow` salva tokens com merge parcial | `serve.test.js` |
| `POST /api/sow` rejeita serviço desconhecido (400) | `serve.test.js` |
| `DELETE /api/sow/:service` remove serviço configurado (200) | `serve.test.js` |
| `DELETE /api/sow/:service` retorna 404 se não configurado | `serve.test.js` |
| `POST /api/sow/telegram/chats` retorna lista de chats | `serve.test.js` |
| `POST /api/sow/telegram/chats` retorna 400 sem token | `serve.test.js` |
| `parsePort` extrai porta de `--port N` | `serve.test.js` |
| Rota desconhecida retorna 404 JSON | `serve.test.js` |

---

## Etapa 1 — Iniciar o servidor

```bash
dgk serve
```

Saída esperada:

```
dgk admin: http://localhost:4322
  Ctrl+C para encerrar.
```

Porta alternativa:

```bash
dgk serve --port 8080
```

| # | O que verificar | Esperado |
|---|---|---|
| S1 | Servidor inicia sem erro | URL impressa no terminal |
| S2 | Porta já em uso | Mensagem de erro clara; processo encerra sem travar |
| S3 | `Ctrl+C` | Servidor encerra limpo; terminal volta ao prompt |

---

## Etapa 2 — Abertura no browser

Abrir `http://localhost:4322` em Chrome ou Safari.

| # | O que verificar | Esperado |
|---|---|---|
| B1 | Página carrega sem erro de console (F12) | Sem `Failed to fetch`, sem erros JS |
| B2 | Seção "Canais" renderiza cards | Um card por canal (Mastodon, Bluesky, Telegram, Buttondown) |
| B3 | Canais não configurados mostram `✗` | Badge vermelho por chave faltante |
| B4 | Canais configurados mostram `✓` com preview mascarado | `✓ 1234••••••••` — token real nunca visível |
| B5 | Seção "Outbox" renderiza (vazia ou com items) | Tabela ou mensagem "Outbox vazio" |
| B6 | Seção "Rate limits" renderiza | Tabela ou mensagem "Sem histórico" |
| B7 | Atualização automática a cada 30s | Timestamp no rodapé muda sem reload manual |

---

## Etapa 3 — Configurar um canal via dashboard

Clicar em **"Configurar"** no card do canal desejado.

| # | Ação | Esperado |
|---|---|---|
| C1 | Painel de config abre abaixo dos cards | Card ativo tem borda verde |
| C2 | Hint com instruções de criação do token visível | Texto informativo antes dos campos |
| C3 | Campo de token usa `type="password"` | Texto mascarado durante digitação |
| C4 | Clicar "Cancelar" | Painel fecha; nenhum valor salvo |
| C5 | Preencher e clicar "Salvar" | Painel fecha; card atualiza com `✓` |
| C6 | Reabrir config do mesmo canal | Campos em branco (nunca pré-preenchidos com o token real) |

---

## Etapa 4 — Descoberta de chats do Telegram

Disponível no painel de config do Telegram após inserir o Bot Token.

| # | Ação | Esperado |
|---|---|---|
| T1 | Clicar "Descobrir chats Telegram" sem token | Alerta "Informe o Bot Token primeiro." |
| T2 | Clicar com token válido | Lista de chats com nome, handle (@) e tipo (canal/grupo/privado) |
| T3 | Sem mensagens enviadas ao bot ainda | "Nenhum chat encontrado. Envie uma mensagem ao bot e tente novamente." |
| T4 | Clicar em um chat da lista | Chat fica destacado; campo Chat ID preenchido automaticamente |
| T5 | Clicar "Salvar" após selecionar chat | Ambos os campos (token + chat_id) salvos no silo |

---

## Etapa 5 — Remover um canal configurado

| # | Ação | Esperado |
|---|---|---|
| R1 | Clicar "Remover" no card configurado | Caixa de confirmação: "Remover configuração de Telegram?" |
| R2 | Confirmar | Card volta a mostrar `✗`; `✓` desaparece |
| R3 | Cancelar a confirmação | Silo não alterado |
| R4 | Clicar "Remover" em canal não configurado | Botão não aparece (apenas "Configurar" é exibido) |

---

## Etapa 6 — Inspecionar outbox e rate limits

| # | O que verificar | Esperado |
|---|---|---|
| O1 | Após `dgk etl`, recarregar o dashboard | Outbox atualizado sem reiniciar o servidor |
| O2 | Nota com `publicationStatus: ready` | Aparece na tabela com status e canais |
| O3 | Após publicação via CLI, recarregar | Rate limits mostram plataforma com `lastSentAt` recente |

---

## Etapa 7 — Segurança básica (local-first)

| # | Verificar | Esperado |
|---|---|---|
| Sec1 | Tentar abrir `http://localhost:4322` de outro dispositivo na rede | Conexão recusada — servidor só aceita `127.0.0.1` |
| Sec2 | Inspecionar resposta de `GET /api/status` | Apenas `preview` mascarado — token real não aparece em nenhum campo |
| Sec3 | Inspecionar `GET /api/services` | Schema de campos sem nenhum valor de credencial |
| Sec4 | Verificar `~/.dgk/silo.json` após save via dashboard | Tokens presentes com permissão `600` |

### 7.1 Proteção contra DNS rebinding

O servidor valida o header `Host` em todas as requisições. Só aceita
`127.0.0.1:<porta>` e `localhost:<porta>` — qualquer outro host recebe 403.

```bash
# Simular requisição com Host externo (deve retornar 403)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Host: evil.example.com" \
  http://127.0.0.1:4322/api/status
```

Esperado: `403`.

```bash
# Requisição legítima (deve retornar 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:4322/api/status
```

Esperado: `200`.

### 7.2 Proteção CSRF em rotas de escrita

Endpoints `POST` e `DELETE` exigem o header `X-Dgk-Admin: 1`.
O dashboard HTML já envia o header automaticamente — esta seção verifica
que uma requisição sem o header (ex: página maliciosa via CORS) é bloqueada.

```bash
# POST sem header CSRF (deve retornar 403)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:4322/api/sow \
  -H "Content-Type: application/json" \
  -d '{"service":"mastodon","tokens":{"MASTODON_TOKEN":"x"}}'
```

Esperado: `403`.

```bash
# POST com header CSRF (deve processar normalmente — 400 por serviço inválido, não 403)
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:4322/api/sow \
  -H "Content-Type: application/json" \
  -H "X-Dgk-Admin: 1" \
  -d '{"service":"plataforma-inexistente","tokens":{"X":"y"}}'
```

Esperado: `400` (serviço desconhecido — a requisição passou pela proteção CSRF).

**Por que manual:** os testes unitários já cobrem os códigos de retorno; esta etapa
confirma o comportamento num servidor real, não apenas num handler mockado.

---

## Smoke check rápido

```bash
dgk serve &
sleep 1
curl -s http://localhost:4322/api/status | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{const j=JSON.parse(d); console.log('canais:', j.channels?.length); process.exit(j.channels?.length > 0 ? 0 : 1)})"
kill %1
```

Esperado: `canais: 4` e exit code 0.

---

## Como reportar falhas

Criar issue com:
- Browser e versão.
- Screenshot da área problemática.
- Output do terminal onde `dgk serve` está rodando.
- Resposta do endpoint relevante (ex: `curl -s http://localhost:4322/api/status`).
- Se o problema é na UI (visual) ou na API (dados), especificar qual.

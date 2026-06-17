---
title: Trilha de Publicação em Canal
aliases:
  - Outbox Passo a Passo
  - Publicar no Telegram
tags:
  - meta/publicacao
  - meta/workflow
  - meta/qualidade
status: published
created: 2026-06-17
updated: 2026-06-17
category: guia
audience: intermediário
related:
  - "[[Outbox Soberana de Publicação]]"
  - "[[Fluxo de Publicação]]"
  - "[[Rotina de Curadoria Editorial]]"
  - "[[Verificando a Configuração do Vault]]"
sidebar:
  order: 94
---

# Trilha de Publicação em Canal

Este roteiro cobre o caminho completo de uma nota desde o vault até um canal externo. Use como verificação manual antes de publicar em produção e como referência para entender cada etapa do pipeline.

O único canal com publicação automática disponível hoje é o **Telegram**. Mastodon, Bluesky e Buttondown aceitam credenciais via `dgk sow`, mas o comando `dgk outbox` ainda não os suporta — ficam marcados como "em desenvolvimento".

---

## Antes de começar

O CI verifica automaticamente:

- Estrutura do vault e lint das notas
- Wiki links dos arquivos de entrada resolvendo

O que você verifica manualmente:

- Configuração das credenciais (feita uma única vez por canal)
- Conteúdo e formatação do rascunho antes de enviar
- Recebimento confirmado no destino

---

## Trilha 1 — Configurar credenciais (uma vez por canal)

Se ainda não configurou o Telegram:

```bash
dgk sow telegram
```

O comando pede `bot_token` e `chat_id` e guarda em `~/.dgk/silo.json`, fora do repositório. Nunca comite esse arquivo.

Para confirmar que ficou configurado:

```bash
dgk check
```

- [ ] `dgk check` mostra `✓ Telegram` na seção de canais de publicação
- [ ] `~/.dgk/silo.json` existe no seu computador e **não** está no `.gitignore` ignorado — ele fica fora do vault, não dentro

---

## Trilha 2 — Criar e preparar o rascunho

Crie ou abra uma nota em `00 - Entrada/`. Use o template disponível:

```text
90 - Modelos/Template - Post Externo.md
```

Adicione no frontmatter os campos de controle da outbox:

```yaml
channels:
  - telegram
publicationStatus: review
```

Rode o ETL para atualizar o dataset da outbox:

```bash
dgk etl
```

- [ ] `.dgk/outbox-publicacao.json` existe e contém a nota
- [ ] A entrada no JSON tem `publicationStatus: review` e `channels: ["telegram"]`

Para revisar visualmente no Lab:

```bash
dgk lab analise-outbox
```

- [ ] Notebook abre no navegador
- [ ] A nota aparece na lista de candidatos pendentes
- [ ] Os campos `canonical`, `privacy` e `license` estão preenchidos ou você entende os riscos de deixá-los em branco

---

## Trilha 3 — Aprovar e publicar

Quando o rascunho estiver pronto, mude no frontmatter da nota:

```yaml
publicationStatus: approved
```

Atualize o dataset:

```bash
dgk etl
```

- [ ] `outbox-publicacao.json` reflete `publicationStatus: approved` para essa nota

Publique no Telegram:

```bash
dgk outbox telegram
```

- [ ] O terminal confirma o envio sem erros
- [ ] A mensagem aparece no canal ou chat do Telegram configurado
- [ ] Texto, links e formatação chegaram como esperado

Após publicar, atualize o frontmatter para registrar:

```yaml
publicationStatus: published
```

Faça commit. O histórico Git documenta quando a nota foi publicada e em qual canal.

---

## Trilha 4 — RSS é separado da outbox

O feed `/rss.xml` não passa pelo fluxo de outbox. Ele é gerado diretamente pelo `astro build` a partir das notas com `status: published`. Para que uma nota apareça no RSS, você precisa:

```yaml
status: published
```

Isso é independente do campo `channels` ou `publicationStatus`.

- [ ] A nota que você quer no RSS tem `status: published`
- [ ] Após `pnpm run site:build`, abra `dist/rss.xml` e confirme que a nota aparece

---

## Referência rápida

| Ação | Comando |
|---|---|
| Configurar credencial do canal | `dgk sow telegram` |
| Verificar estado dos canais | `dgk check` |
| Atualizar dataset da outbox | `dgk etl` |
| Revisar candidatos no Lab | `dgk lab analise-outbox` |
| Publicar no Telegram | `dgk outbox telegram` |

Quando outros canais ficarem disponíveis, o fluxo é o mesmo: `dgk sow <canal>` + `channels: [<canal>]` no frontmatter + `dgk outbox <canal>`.

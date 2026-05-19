---
title: Configurando com Devcontainer
aliases:
  - Setup Devcontainer
  - Ambiente de Desenvolvimento no Container
tags:
  - meta/setup
  - meta/devcontainer
status: published
created: 2026-05-19
updated: 2026-05-19
category: guia
audience: tecnico
related:
  - "[[Preparando seu Computador para o Vault]]"
  - "[[Configurando Localmente]]"
---
# Configurando com Devcontainer

O devcontainer é um ambiente de desenvolvimento completo que roda dentro do
VS Code sem precisar instalar Node.js, Python ou outras ferramentas manualmente.
Tudo vem pré-configurado — incluindo extensões, locale PT-BR e dependências do vault.

## Requisitos

- **VS Code** — <https://code.visualstudio.com/>
- **Extensão Dev Containers** — instale no VS Code:
  `ms-vscode-remote.remote-containers`
- **Docker Desktop** — <https://www.docker.com/products/docker-desktop/>
  (ou Docker Engine no Linux)

## O que vem pré-instalado

| Ferramenta | Versão |
|---|---|
| Node.js | 22 (LTS) |
| pnpm | via Corepack |
| uv | última estável |
| Locale | pt_BR.UTF-8 |

**Extensões VS Code instaladas automaticamente:**

- Foam (wikilinks e grafo de notas)
- markdownlint (qualidade do Markdown)
- Prettier (formatação)

## Como abrir

1. Clone o repositório localmente.
2. Abra a pasta no VS Code.
3. Quando aparecer a notificação "Reopen in Container", clique nela.
   (Ou use o comando `Dev Containers: Reopen in Container` na paleta.)
4. Aguarde o Docker baixar a imagem e instalar as dependências.
   Na primeira vez, leva alguns minutos.

## O que esperar durante a instalação

O VS Code mostra o log do container. Você verá:

1. Download da imagem base
2. Instalação do locale pt_BR
3. `pnpm install --frozen-lockfile`
4. Configuração do Git

Ao final, o terminal exibe:

```
=== Ambiente pronto ===
Node.js : v22.x.x
pnpm    : x.x.x
uv      : uv x.x.x
=======================
```

Essa mensagem confirma que todas as ferramentas estão funcionando.

## Ao retomar o container

Quando você reabre o VS Code depois de fechar, o container verifica
automaticamente se tudo está em ordem:

- Se `node_modules` sumiu: avisa para rodar `pnpm install`
- Se os hooks do Git precisam de reconfiguração: roda `setup_git.sh` sozinho
- Imprime `[devcontainer] Container pronto.` quando terminado

## Dicas

- O store do pnpm fica num volume Docker persistente — reinstalações são rápidas.
- Para reconstruir o container do zero: `Dev Containers: Rebuild Container`.
- Para abrir um terminal dentro do container: `` Ctrl+` `` no VS Code.

---

Voltar para [[Preparando seu Computador para o Vault]]

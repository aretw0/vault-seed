---
title: Usando o Lab (Notebooks Marimo)
aliases:
  - Lab
  - Notebooks Marimo
tags:
  - meta/lab
  - meta/notebooks
  - meta/automacao
status: published
created: 2026-05-22
updated: 2026-05-22
category: guia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
---

# Usando o Lab

O Lab é a área de notebooks interativos do vault. Ele usa Marimo para transformar dados do vault em painéis exploráveis, sem separar a análise do repositório onde as notas vivem.

## O Que Vem Pronto

- Notebook de análise de publicação: visão de status, tags e distribuição por pasta.
- Notebook de análise de grafo: visão de links, notas órfãs e links quebrados.
- `99 - Meta e Anexos/Notebooks/starters/`: exemplos para copiar quando quiser criar um notebook próprio.

## Rodando Localmente

Use:

```bash
pnpm run notebooks:dev
```

O comando abre o Marimo apontando para `99 - Meta e Anexos/Notebooks`. No devcontainer, a porta `2718` já fica preparada para uso.

## Como Os Dados Chegam Ao Notebook

Durante o build do site, a integração Astro gera `vault-data.json` com metadados das notas. Os notebooks publicados leem esse arquivo como snapshot do último deploy.

Isso mantém o Lab em modo leitura: ele ajuda a enxergar o vault, mas não modifica notas automaticamente.

## Publicação

O workflow `.github/workflows/deploy-site.yml` exporta os notebooks de análise como HTML WebAssembly depois do build Astro. Por padrão, eles ficam em `/lab/` junto com o site publicado.

No preview local do Astro, a página `/lab/` aparece, mas os notebooks exportados só existem depois do passo de deploy. Para testar a experiência interativa localmente, use `pnpm run notebooks:dev`.

## Criando Um Notebook

1. Copie um arquivo de `99 - Meta e Anexos/Notebooks/starters/`.
2. Renomeie a cópia dentro de `99 - Meta e Anexos/Notebooks/`.
3. Abra com `pnpm run notebooks:dev`.
4. Leia `vault-data.json` quando precisar analisar notas, tags, status ou links.

Se o notebook também deve aparecer no site publicado, adicione um passo de export em `.github/workflows/deploy-site.yml` e um item na página `.site/pages/lab/index.astro`.

---
title: Preparando Dados para o Lab
aliases:
  - ETL para o Lab
  - Datasets do Lab
tags:
  - meta/notebooks
  - meta/dados
status: published
created: 2026-05-23
updated: 2026-05-23
category: workflow
audience: intermediário
related:
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Publicando seu Vault como Site]]"
---

# Preparando Dados para o Lab

O Lab funciona melhor quando os notebooks leem dados já preparados. A coleta,
limpeza e redução de dados pode exigir arquivos locais, APIs, OCR, scraping ou
ferramentas que não rodam no navegador. Essa parte deve acontecer antes da
publicação, em scripts versionados.

O notebook publicado deve receber um snapshot simples: JSON, CSV, Parquet ou
outro arquivo que possa ser servido pelo site.

## Manifesto de datasets

Os datasets publicados pelo Lab são declarados em `.site/lab.datasets.json`.
Um manifesto vazio é válido:

```json
[]
```

Para empacotar um arquivo local junto com o Lab:

```json
[
  {
    "id": "exemplo",
    "title": "Exemplo",
    "description": "Snapshot usado por um notebook do Lab",
    "source": "dados/exemplo.json",
    "output": "exemplo.json",
    "format": "json",
    "publish": true
  }
]
```

Para registrar uma fonte remota que será lida em runtime pelo navegador:

```json
[
  {
    "id": "remoto",
    "title": "Fonte remota",
    "description": "Endpoint público consumido pelo notebook",
    "runtimeUrl": "https://example.com/data.json",
    "output": "remoto.json",
    "format": "json",
    "publish": true
  }
]
```

Fontes remotas não são baixadas por esse comando. Elas entram no manifesto para
que o notebook saiba onde buscar os dados quando estiver rodando no navegador.

## Comandos

Para preparar apenas os datasets:

```bash
pnpm run notebooks:etl
```

Esse comando escreve:

- `public/lab/datasets/manifest.json`
- `public/lab/assets/datasets/manifest.json`
- arquivos locais publicados em `public/lab/datasets/`
- a mesma cópia em `public/lab/assets/datasets/`

A duplicação é intencional. O export WebAssembly do Marimo pode resolver
arquivos relativos a partir da raiz do Lab ou da pasta `assets/`.

Quando a coleta exigir navegador real, use Playwright em scripts locais ou de CI
antes do export. O Playwright faz parte da stack do vault porque também valida a
renderização responsiva do site publicado; o contrato continua igual: ele deve
produzir snapshots servíveis para o Lab, não virar dependência do notebook
WebAssembly.

Os comandos do Lab também preparam os datasets automaticamente:

```bash
pnpm run notebooks:dev
pnpm run notebooks:check
pnpm run notebooks:export
pnpm run site:dev:lab
```

## O que é verificável

Para arquivos locais, o manifesto gerado registra tamanho em bytes e `sha256`.
Se o arquivo apontado em `source` não existir, o comando falha. Se um dataset
tentar sair do repositório com `..`, o comando também falha.

Isso mantém a publicação reproduzível: notebooks publicados leem arquivos
preparados; scripts locais ou CI produzem esses arquivos antes do empacotamento.

## Como o notebook lê

No notebook, leia primeiro o manifesto:

```python
import json
from urllib.request import urlopen

datasets = json.loads(urlopen("./assets/datasets/manifest.json").read())
```

Para um dataset local, use `assetPath`:

```python
dataset = datasets["datasets"][0]
conteudo = urlopen(f"./{dataset['assetPath']}").read()
```

Para um dataset remoto, use `url` e trate CORS, tamanho da resposta e tempo de
carregamento como parte do contrato da fonte.

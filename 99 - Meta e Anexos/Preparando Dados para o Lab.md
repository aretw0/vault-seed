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
  - "[[Coletando Dados Locais com Scraping e OCR]]"
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

Para diagnosticar as ferramentas opcionais de coleta local, use:

```bash
pnpm run notebooks:extract:check
```

Para instalar o Chromium usado pelo Playwright Python, use:

```bash
pnpm run notebooks:extract:browser
```

Receitas completas de scraping, OCR, APIs com token e snapshot local ficam em
[[Coletando Dados Locais com Scraping e OCR]].

Os comandos do Lab também preparam os datasets automaticamente:

```bash
pnpm run notebooks:dev
pnpm run notebooks:check
pnpm run notebooks:export
pnpm run site:dev:lab
```

## Exemplo incluído

O comando `pnpm run notebooks:etl` roda primeiro um exemplo pequeno de ETL local:

```bash
pnpm run notebooks:etl:demo
```

Esse script lê as notas Markdown no computador, calcula um perfil simples do
vault e escreve `dados/lab/perfil-do-vault.json`. Ele também roda a auditoria
compartilhada de arquitetura de informação e escreve
`dados/lab/curadoria-ia.json`, um relatório JSON com notas avaliadas, avisos
editoriais, candidatas a promoção e distribuição por intenção. Depois,
`prepare_lab_datasets.mjs` empacota esses arquivos em `public/lab/datasets/` e
`public/lab/assets/datasets/`.

O notebook `ETL`, publicado como `/lab/etl.html`, lê esses snapshots empacotados.
Ele também mostra uma fonte remota opcional declarada no manifesto. Essa fonte
não é baixada durante o preparo local; ela só é acessada no navegador quando a
pessoa ativa o carregamento no notebook publicado.

## O que é verificável

Para arquivos locais, o manifesto gerado registra tamanho em bytes e `sha256`.
Se o arquivo apontado em `source` não existir, o comando falha. Se um dataset
tentar sair do repositório com `..`, o comando também falha.

Isso mantém a publicação reproduzível: notebooks publicados leem arquivos
preparados; scripts locais ou CI produzem esses arquivos antes do empacotamento.

## Como o notebook lê

Notebooks publicados devem usar o runtime compartilhado do Lab em vez de repetir
lógica de caminhos em cada arquivo:

```python
from _lab_notebook_runtime import load_lab_manifest, read_lab_json

manifest = load_lab_manifest()
datasets = {dataset["id"]: dataset for dataset in manifest["datasets"]}
snapshot = read_lab_json(datasets["perfil-do-vault"]["assetPath"])
```

O helper normaliza caminhos como `assets/datasets/...`, tenta as rotas que o
Marimo WebAssembly costuma resolver (`datasets/...` e `assets/datasets/...`) e
mantém fallback local para CI e execução fora do navegador.

O mesmo runtime expõe sinais para notebooks que precisam funcionar nos dois
modos:

```python
from _lab_notebook_runtime import lab_runtime_context, require_local_runtime

context = lab_runtime_context()
if context["isLocal"]:
    require_local_runtime("coleta com Playwright ou OCR")
    # rode aqui operações que não devem ir para o HTML publicado
```

Use `lab_runtime_context()` para decidir se a célula está rodando localmente ou
empacotada em Pyodide/WASM. Use `require_local_runtime()` como trava explícita
para coletas com Playwright, OCR, APIs com credenciais, arquivos privados ou
qualquer operação que não deve executar no navegador de quem visita o site.

Para um dataset remoto, use `url` e trate CORS, tamanho da resposta, tempo de
carregamento e privacidade como parte do contrato da fonte. O notebook ETL deixa
fontes remotas como opt-in: por padrão ele só usa snapshots empacotados.

## Kitchen sink ETL soberano

O exemplo `/lab/etl.html` consolida uma curadoria de capacidades mínimas de ETL:
scraping, arquivos, OCR, APIs com credenciais, transformação, carga e
visualização.

No template, a divisão de responsabilidade é:

- **notebook local** é a bancada de trabalho e pode acionar operações que exigem
  segredos, navegador real, binários do sistema ou alto custo de processamento;
- **datasets do Lab** publicam snapshots pequenos, verificáveis e servíveis pelo
  site;
- **notebook empacotado** demonstra transformação, auditoria, visualização e
  exportação leve em JSON/CSV, sem esconder a lógica da pessoa dona do vault.

Essa fronteira evita drift de stack: a interface de análise continua sendo o
Marimo, mas as partes não empacotáveis ficam guardadas por detecção de runtime e
produzem snapshots portáveis. Assim o usuário final tem ferramentas mínimas de
soberania digital para trazer dados da própria realidade a um formato
versionável, inspecionável e independente de plataformas externas.

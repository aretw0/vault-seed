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
  - "[[Publicando e Consumindo RSS no Vault]]"
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
dgk etl
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
[[Coletando Dados Locais com Scraping e OCR]]. Para feeds abertos, veja também
[[Publicando e Consumindo RSS no Vault]].

Os comandos do Lab também preparam os datasets automaticamente:

```bash
dgk lab <nome-do-notebook>
pnpm run notebooks:check
dgk lab export
pnpm run site:dev:lab
```

## ETL no deploy

O workflow `deploy-site.yml` executa `pnpm run notebooks:etl` automaticamente
antes de `astro build` e do export dos notebooks. O usuário não precisa commitar
`dados/lab/` localmente — os snapshots são gerados em CI a cada push para `main`,
a partir das notas do vault no momento do deploy.

### Por que `dados/lab/` é uma pasta visível

Este template é uma referência educativa. A pasta `dados/lab/` poderia ficar em
um diretório oculto — como `.dados/`, `.lab/` ou dentro de `.site/` — o que é
prática comum em ferramentas que tratam metadados de build como artefatos
efêmeros e não para leitura humana direta.

A escolha de mantê-la visível é intencional: quem usa o vault consegue
inspecionar os snapshots, entender o que o ETL produz e adaptar scripts de
ingestão com base em exemplos concretos. A transparência tem custo — os arquivos
aparecem no explorador de pastas e no histórico Git — mas isso faz sentido
enquanto o objetivo é demonstrar o pipeline.

À medida que o projeto amadurece, é possível que `dados/lab/` migre para uma
pasta oculta quando `dados/` passar a ser reservada para conteúdo editável pelo
usuário (feeds, fontes, rascunhos) e os snapshots de ETL passarem a ser tratados
como artefatos de build sem valor permanente. Outros projetos da mesma família
usam esse padrão de pasta oculta para metadados exportáveis.

## Exemplo incluído

O comando `dgk etl` inclui automaticamente um exemplo pequeno de ETL local (equivalente ao antigo `pnpm run notebooks:etl:demo`).

O ETL lê as notas Markdown no computador, calcula um perfil simples do
vault e escreve `dados/lab/perfil-do-vault.json`. Ele também roda a auditoria
compartilhada de arquitetura de informação e escreve
`dados/lab/curadoria-ia.json`, um relatório JSON com notas avaliadas, avisos
editoriais, candidatas a promoção e distribuição por intenção. O mesmo fluxo
normaliza OPML em `dados/lab/feeds-assinados.json` e gera a outbox a partir de
frontmatter em `dados/lab/outbox-publicacao.json`. Depois,
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

## Gerando notas para Bases e Dataview

O Lab também pode produzir notas Markdown locais, desde que isso aconteça antes
da publicação. Essa é a ponte pragmática entre Marimo, Obsidian Bases e
Dataview: o notebook calcula, mas o resultado vira uma nota versionada que o
Obsidian consegue agregar imediatamente.

```python
from _lab_notebook_runtime import write_local_markdown_note

write_local_markdown_note(
    "00 - Entrada/Resumo gerado pelo Lab.md",
    "# Resumo gerado pelo Lab\n\nRevise este rascunho antes de promover.",
    frontmatter={
        "type": "lab-note",
        "status": "rascunho",
        "source": "lab/etl-demo",
        "tags": ["lab/gerado", "inbox/revisar"],
    },
)
```

Depois disso, no Obsidian você pode criar uma Base filtrando
`lab_generated = true`, ou uma consulta Dataview:

```text
TABLE status, source
FROM "00 - Entrada"
WHERE lab_generated = true
SORT file.mtime DESC
```

A regra continua a mesma: Marimo ajuda a gerar rascunhos e snapshots; o vault em
Markdown continua sendo a fonte revisável e auditável.

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

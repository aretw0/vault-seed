# Marimo, WASM e ETL no vault-seed

Este documento registra a fronteira técnica entre notebooks Marimo, site Astro e
ingestão de dados no `vault-seed`.

## Princípio

Notebooks publicados em `/lab/` devem ser consumidores de dados preparados, não
o principal motor de coleta. O HTML WebAssembly roda no navegador via Pyodide:
isso é ótimo para exploração interativa, mas não substitui um ambiente Python
local, um runner de CI ou um backend.

## Modos

| Modo | Runtime | Bom para | Evitar |
| --- | --- | --- | --- |
| `pnpm run notebooks:dev` | Python local via `uv` | desenvolvimento, depuração, agentes, Playwright, OCR, APIs autenticadas | assumir que tudo isso funcionará no export WASM |
| `marimo run` | servidor Python | app interno com backend | GitHub Pages sem servidor |
| `marimo export html-wasm` | navegador via Pyodide | publicação estática, demos, análise leve sobre snapshots | dependências nativas, browser automation, secrets locais, processos longos |

## Rede E Pyodide

O export WebAssembly depende de arquivos externos do Pyodide carregados pelo
navegador. Por isso, o smoke responsivo verifica se o Chromium consegue acessar
essa dependência antes de avaliar os notebooks.

Em CI e deploy, `VAULT_RESPONSIVE_REQUIRE_EXTERNAL=1` torna essa verificação
obrigatória. Se a rede externa estiver bloqueada, o job falha porque a hidratação
real do Marimo não foi validada.

Em sandboxes de agentes ou ambientes locais restritos, o mesmo script pode rodar
em modo parcial e relatar `externalNetwork=unavailable-partial`. Isso valida
rotas, layout e presença dos artefatos, mas não substitui a validação completa
em devcontainer, navegador local ou GitHub Actions.

## ETL

O kit de ingestão deve ficar em scripts ou módulos Python/Node versionados. O
resultado esperado para o Lab é um artefato de leitura: JSON, CSV, Parquet ou
outro formato que o navegador consiga baixar e carregar de forma previsível.

O contrato inicial é `.site/lab.datasets.json`, processado por
`pnpm run notebooks:etl`. Entradas com `source` copiam snapshots locais para
`public/lab/datasets/` e `public/lab/assets/datasets/`; entradas com
`runtimeUrl` são registradas no manifesto sem fetch local.

Fluxo recomendado:

1. Extrair dados de arquivos, páginas, OCR ou APIs em ambiente local/CI.
2. Transformar e reduzir para um snapshot pequeno o suficiente para publicação.
3. Salvar esse snapshot em `.dgk/` ou outro estado local ignorado pelo Git.
4. Empacotar o recorte publicável durante o export do site.
5. Carregar o snapshot no notebook Marimo.

Para arquivos empacotados junto de um notebook WebAssembly, a documentação do
Marimo recomenda uma pasta `public/` ao lado do notebook e `mo.notebook_location()`
para montar caminhos que funcionem localmente e no export.

## Stack De Dados

A camada de ETL deve crescer como stack própria do repositório, não como
dependência dos notebooks Marimo empacotados. Se uma ferramenta não funciona no
HTML WebAssembly, ela não deve ser requisito do notebook publicado.

Playwright entra nessa stack como ferramenta local/CI para duas tarefas que se
reforçam: validar responsividade do site publicado em navegador real e executar
coletas que exigem browser automation. Em ambos os casos, o resultado publicável
deve ser um artefato estável consumido pelo Lab.

Essa stack pode incluir conectores para arquivos, páginas, OCR, APIs e outras
fontes, desde que rode antes da publicação e produza artefatos estáveis para o
Lab consumir. As dependências opcionais dessa bancada ficam em
`requirements.local-etl.txt` e podem ser diagnosticadas com
`pnpm run notebooks:extract:check`.

O Lab publicado não deve carregar detalhes de implementação dessa camada nem
depender diretamente de ferramentas que só funcionam em ambiente local ou CI. O
contrato entre as duas partes é o dado preparado: JSON, CSV, Parquet ou outro
formato servível pelo site.

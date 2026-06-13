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
updated: 2026-05-25
category: guia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
  - "[[Usando com Agentes de IA]]"
  - "[[Coletando Dados Locais com Scraping e OCR]]"
  - "[[Publicando e Consumindo RSS no Vault]]"
---

# Usando o Lab

O Lab é a área de notebooks interativos do vault. Ele usa Marimo para transformar dados do vault em painéis exploráveis, sem separar a análise do repositório onde as notas vivem.

Marimo é diferente de JupyterLab em um ponto central: o notebook é um arquivo Python (`.py`) versionado no Git, não um JSON `.ipynb` com estado de execução embutido. Isso deixa o notebook mais legível para pessoas, para revisão de diff e para agentes de IA.

## Para Quem Vem Do JupyterLab

No Jupyter, você costuma pensar em uma sessão REPL: executa uma célula, depois outra, e o kernel pode acumular estado invisível. No Marimo, as células formam um grafo de dependências. Quando uma célula muda, as células que dependem das variáveis dela são reexecutadas ou marcadas como desatualizadas.

Consequências práticas:

- A ordem visual das células não é a única fonte de verdade; as dependências entre variáveis importam.
- Evite definir a mesma variável global em várias células. Prefira funções, nomes temporários com `_` e transformações explícitas.
- O arquivo salvo é Python. Você revisa alterações com `git diff`, compila com Python e pode executar/exportar por linha de comando.
- O editor do Marimo pode normalizar o arquivo ao salvar, incluindo metadados como `__generated_with` e formatação de células. Revise o diff antes de commitar.
- Pastas locais de estado como `__marimo__/` não são parte do conhecimento do vault e ficam ignoradas pelo Git.

Referências úteis: [Coming from Jupyter](https://docs.marimo.io/guides/coming_from/jupyter/), [Using agent CLIs](https://docs.marimo.io/guides/generate_with_ai/marimo_pair/) e [WebAssembly HTML](https://docs.marimo.io/guides/exporting/webassembly_html/).

## O Que Vem Pronto

- Notebook de análise de publicação: visão de status, tags e distribuição por pasta.
- Notebook de análise de grafo: visão de links, notas órfãs e links quebrados.
- `99 - Meta e Anexos/Notebooks/starters/`: exemplos para copiar quando quiser criar um notebook próprio, incluindo `coleta-local.py` para scraping, OCR, segredos locais e snapshots.

## Rodando Localmente

Se estiver no devcontainer, as dependências Python já são instaladas na criação do ambiente. Fora do devcontainer, instale o `uv`; os comandos do Lab usam `uv run --with-requirements requirements.txt`, então não dependem de um `marimo` global no `PATH`.

Use:

```bash
dgk lab <nome-do-notebook>
```

Por exemplo, `dgk lab analise-feeds` abre o notebook `analise-feeds.py` diretamente no Marimo. Diferente do comando anterior `pnpm run notebooks:dev` — que subia um servidor com todos os notebooks — `dgk lab` abre um notebook específico pelo nome, sem extensão.

O comando gera `public/lab/vault-data.json`, sobe o servidor Marimo na porta `2718` para o notebook escolhido e mantém o snapshot local atualizado enquanto você edita notas. Ele também usa `--watch`, então alterações feitas por VS Code, Codex, Claude ou Pi no arquivo `.py` podem ser recarregadas no editor do Marimo.

Para encerrar o servidor local, use `Ctrl+C` no terminal onde ele está rodando. O comando passa `--yes` para o Marimo para evitar o prompt interativo de confirmação, que pode se comportar mal em wrappers de terminal no Windows.

Se quiser só atualizar os dados sem abrir o Marimo, use:

```bash
pnpm run notebooks:data
```

Para validar os notebooks sem depender do navegador, use:

```bash
pnpm run notebooks:check
```

Esse comando regenera `vault-data.json`, roda `marimo check` nos notebooks e executa as sessões com `marimo export session`. Os snapshots de sessão ficam em `__marimo__/`, uma pasta local ignorada pelo Git.

## Como Os Dados Chegam Ao Notebook

No uso local, `dgk lab <nome>` gera `public/lab/vault-data.json` diretamente a partir das notas do vault. Durante o build do site, a integração Astro usa o mesmo gerador para criar o snapshot que será publicado.

Isso mantém o Lab em modo leitura: ele ajuda a enxergar o vault, mas não modifica notas automaticamente.

O Lab modifica apenas os notebooks que você edita. As notas Markdown do vault são lidas para gerar o snapshot `vault-data.json`.

## Idioma E Acentos

Este vault configura o Marimo com `locale = "pt-BR"` em `pyproject.toml`. Isso ajusta formatação de datas, números e tempos relativos quando o navegador e o Marimo suportam esse locale.

Essa configuração não traduz toda a interface do Marimo. Segundo a documentação oficial, textos da UI, mensagens de erro e documentação do Marimo ainda não são localizados. Por isso, os notebooks deste vault mantêm títulos, seções e labels em português, enquanto alguns controles internos do editor podem continuar em inglês.

Os notebooks leem `vault-data.json` com `encoding="utf-8"` para preservar acentos e tils em títulos e links.

## Tema Visual

O Marimo carrega `.site/styles/marimo-vault.css` via `custom_css` em `pyproject.toml`. Esse arquivo aproxima os notebooks da paleta verde-jardim do site, em modo claro e escuro. O contrato também cobre tabelas, seletores e tooltips de gráficos Altair/Vega para evitar popovers claros quebrando o modo escuro.

A personalização atua sobre variáveis CSS usadas pelo Marimo, como `--background`, `--foreground`, `--primary`, `--accent`, `--border` e escalas `--slate-*`/`--grass-*`. A estrutura do editor continua sendo do Marimo; o vault controla a paleta e alguns detalhes de leitura, não substitui completamente o tema interno da ferramenta.

No Marimo local, a seleção claro/escuro/sistema é do próprio editor. O `pyproject.toml` do vault não fixa `theme`, justamente para respeitar a escolha feita nas configurações do Marimo. No site publicado do `vault-seed`, o export injeta um seletor discreto em cada notebook com as paletas Verde jardim, Oceano e Terracota, além das opções Sistema, Claro e Escuro. A escolha fica no `localStorage` do navegador e não altera arquivos do vault.

Esse seletor é uma demonstração do `vault-seed`; vaults criados a partir dele herdam a paleta e o arquivo de configuração, mas não recebem o seletor por padrão. Para uma demonstração pontual em outro vault, rode o export com `VAULT_MARIMO_THEME_SELECTOR=1`.

O mesmo vale para o seletor de tema do site Astro: ele aparece no `vault-seed` para demonstração ao vivo, mas fica oculto em vaults inicializados. As paletas continuam disponíveis nos arquivos `.site/styles/themes/` e `.site/styles/theme-runtime.css` para quem quiser escolher uma configuração fixa ou criar sua própria UI.

## Publicação

O workflow `.github/workflows/deploy-site.yml` exporta como HTML WebAssembly apenas os notebooks listados em `.site/lab.notebooks.json` com `publish: true`. Por padrão, eles ficam em `/lab/` junto com o site publicado.

No preview local do Astro, a página `/lab/` aparece, mas os notebooks exportados só existem depois do passo de export. Para experimentar a versão empacotada localmente, rode:

```bash
pnpm run site:build
dgk lab export
pnpm run site:preview
```

Para ver os notebooks exportados enquanto usa o servidor de desenvolvimento do Astro, gere os HTMLs em `public/lab/` e suba o site:

```bash
pnpm run site:dev:lab
```

Para desenvolver notebooks com Python rodando no seu computador, use `dgk lab <nome-do-notebook>`.

O HTML WebAssembly do Marimo carrega Pyodide no navegador. Em ambientes normais, como devcontainer, navegador local e GitHub Actions, isso exige acesso externo aos arquivos do Pyodide. Em sandboxes de agentes ou máquinas com política de rede restrita, a página pode carregar a estrutura do notebook sem hidratar o Python; nesse caso, trate o resultado como uma prévia parcial.

Para validar a publicação localmente em navegador real, use:

```bash
pnpm run site:responsive
```

Esse smoke test informa se a rede externa do navegador foi verificada. No CI e no deploy, a validação exige essa rede e falha se Pyodide não puder ser carregado.

## Visualizações, Código E Slides

O editor local do Marimo tem controles de visualização que ajudam durante a criação do notebook. A versão publicada em `/lab/` é diferente: ela é um HTML WebAssembly exportado para leitura e interação no navegador.

No Lab publicado, o export usa `marimo export html-wasm` em modo `run`. Esse modo entrega uma página interativa, sem depender de servidor Python, mas não leva todos os controles do editor local.

Para apresentações publicadas no navegador, este vault usa o layout nativo de slides do Marimo via `layout_file`. O arquivo de layout fica em `99 - Meta e Anexos/Notebooks/layouts/apresentacao-vault-seed.slides.json`, versionado junto do notebook, e é copiado temporariamente durante o export para manter o HTML WebAssembly self-contained.

O Marimo também exporta notebooks para outros formatos. Os caminhos mais úteis aqui são:

| Formato | Comando base | Uso indicado |
| --- | --- | --- |
| HTML WebAssembly | `marimo export html-wasm` | publicar o Lab estático em `/lab/` |
| HTML com servidor | `marimo export html` | gerar uma página HTML a partir de uma execução local |
| PDF documento | `marimo export pdf --as=document` | arquivar ou compartilhar uma leitura linear |
| PDF slides | `marimo export pdf --as=slides` | apresentação |
| Jupyter | `marimo export ipynb` | interoperar com o ecossistema `.ipynb` |
| Markdown | `marimo export md` | revisar ou reaproveitar conteúdo como texto |
| Script | `marimo export script` | gerar um Python plano |
| Session | `marimo export session` | validar execução sem navegador |

O vault já tem um notebook de apresentação em `99 - Meta e Anexos/Notebooks/apresentacao-vault-seed.py`. Ele declara `layout_file="layouts/apresentacao-vault-seed.slides.json"` para criar a navegação de apresentação no HTML publicado.

Para exportá-lo como HTML WebAssembly de apresentação:

```bash
pnpm run notebooks:export:slides
```

Por padrão, o HTML é gerado em `dist/lab/vault-seed-slides.html`. Se você configurar `VAULT_NOTEBOOKS_PATH`, ele segue esse segmento, por exemplo `dist/notebooks/vault-seed-slides.html`. Esse arquivo é um artefato local de build, não uma nota do vault.

Para gerar um PDF de apresentação quando o ambiente suportar Playwright/WebPDF, use o fluxo próprio de PDF em slides:

```bash
uv run --no-project --with-requirements requirements.txt marimo export pdf CAMINHO_DO_NOTEBOOK.py -o apresentacao.pdf --as=slides --raster-server=live
```

Esse caminho pode precisar de Chromium instalado pelo Playwright. Se o export acusar ausência do navegador, instale uma vez com:

```bash
uv run --with playwright playwright install chromium
```

Esse caminho gera um artefato de apresentação estático, mas é mais sensível ao ambiente local. Em Windows, o caminho PDF pode esbarrar na combinação `nbconvert` + Playwright + event loop assíncrono; nesse caso, prefira a apresentação em HTML WebAssembly ou rode o PDF em Linux/WSL/CI.

Para o site `/lab/`, continue usando o HTML WebAssembly como experiência interativa principal. Slides só entram no Lab publicado quando há uma entrada consciente em `.site/lab.notebooks.json` com `publish: true`, como acontece com a apresentação demonstrativa do `vault-seed`.

## Modos De Execução

O Lab tem três modos com limites diferentes:

| Modo | Onde o Python roda | Uso indicado |
| --- | --- | --- |
| `dgk lab <nome>` | No seu computador | criação, depuração, acesso a arquivos locais e integração com agentes |
| `marimo run` | Em um servidor Python | apps internos com backend, quando houver infraestrutura para isso |
| `marimo export html-wasm` | No navegador, via WebAssembly/Pyodide | publicação estática, demos, exploração leve e interativa |

O modo publicado não tem um computador remoto por baixo. Ele roda no navegador de quem abre a página. Por isso, notebooks publicados devem evitar dependências de sistema, automação de navegador, processos longos, credenciais locais e acesso direto ao filesystem da máquina.

## Dados E ETL

Use os notebooks publicados como camada de leitura, exploração e apresentação. Quando a coleta ou transformação exigir Playwright, OCR, APIs autenticadas, scraping, arquivos grandes ou dependências de sistema, prefira rodar essa etapa antes, em scripts locais ou em automações de CI.

O fluxo recomendado é:

1. Coletar dados de fontes locais ou remotas com scripts versionados.
2. Normalizar e reduzir os dados para formatos portáteis, como JSON, CSV ou Parquet.
3. Publicar apenas snapshots e arquivos auxiliares necessários para a análise.
4. Fazer o notebook Marimo consumir esses snapshots.

Para dados que devem ir junto com um notebook WebAssembly, use uma pasta `public/` ao lado do notebook e acesse os arquivos com `mo.notebook_location()`. Para dados remotos em runtime, prefira APIs públicas ou endpoints preparados para navegador, observando CORS, tamanho de resposta e tempo de carregamento.

Essa separação mantém o site barato de hospedar, fácil de publicar e previsível para quem abre o Lab.

O export do Lab copia `vault-data.json` para `/lab/vault-data.json` e `/lab/assets/vault-data.json`. O segundo caminho atende ao runtime WebAssembly do Marimo, que pode resolver arquivos relativos a partir da pasta de assets do pacote exportado.

Datasets adicionais são declarados em `.site/lab.datasets.json` e preparados com `dgk etl`. Veja [[Preparando Dados para o Lab]] para o contrato entre scripts de ingestão, snapshots publicados e notebooks. Para receitas práticas com scraping, OCR e APIs com token, veja [[Coletando Dados Locais com Scraping e OCR]]. Para usar feeds como fonte aberta de dados, veja [[Publicando e Consumindo RSS no Vault]]. Para revisar rascunhos antes de enviar a outros canais, veja [[Outbox Soberana de Publicação]].

## Criando Um Notebook

1. Copie um arquivo de `99 - Meta e Anexos/Notebooks/starters/`.
2. Renomeie a cópia dentro de `99 - Meta e Anexos/Notebooks/`.
3. Abra com `dgk lab <nome-do-notebook>` (ex: `dgk lab meu-notebook`).
4. Leia `vault-data.json` quando precisar analisar notas, tags, status ou links.

Você pode criar quantos notebooks quiser nessa pasta. Eles são arquivos Python versionados junto com o vault e continuam locais até entrarem no manifesto de publicação.

Fluxo recomendado:

1. Trabalhe localmente com `dgk lab <nome-do-notebook>`.
2. Crie ou edite notebooks em `99 - Meta e Anexos/Notebooks/`.
3. Rode `pnpm run notebooks:data` quando quiser regenerar apenas o snapshot (operação de desenvolvimento, sem equivalente em `dgk`).
4. Revise `git diff` antes de commitar, especialmente depois de salvar pelo editor do Marimo.
5. Publique apenas notebooks que entraram conscientemente no manifesto.

## Governança De Publicação

Criar um notebook não publica esse notebook. Para publicar, adicione uma entrada em `.site/lab.notebooks.json`:

```json
{
  "title": "Meu Notebook",
  "source": "99 - Meta e Anexos/Notebooks/meu-notebook.py",
  "output": "meu-notebook.html",
  "description": "descrição curta do que ele mostra",
  "publish": true
}
```

Esse manifesto controla três coisas ao mesmo tempo: quais notebooks são exportados pelo deploy, quais aparecem em `/lab/` e qual nome público cada arquivo recebe.

## Agentes E Marimo

O caminho padrão para agentes neste vault é o tradicional: o agente lê e edita arquivos `.py`, roda comandos de validação e deixa o humano usar o Marimo para inspecionar o resultado interativo. Esse fluxo já funciona com Codex, Claude, Pi ou qualquer agente que opere no terminal.

Prompt operacional útil:

```text
Edite o notebook em 99 - Meta e Anexos/Notebooks/NOME.py.
Use os notebooks existentes como padrão.
Depois rode pnpm run notebooks:check.
Não publique o notebook sem atualizar conscientemente .site/lab.notebooks.json.
```

Se o agente precisa de feedback do runtime vivo, abra o notebook com `dgk lab <nome-do-notebook>` e gere o prompt de pareamento:

```bash
pnpm run notebooks:pair -- --url URL_DO_MARIMO --codex
```

Troque `--codex` por `--claude` ou `--opencode` quando estiver usando outro agente compatível. Esse comando chama `marimo pair prompt`; ele não substitui o Git nem o diff, mas dá ao agente instruções para trabalhar com a sessão aberta. (`pnpm run notebooks:pair` é uma operação de desenvolvimento sem equivalente em `dgk`.)

Camadas disponíveis:

- `pnpm run notebooks:check`: feedback determinístico de arquivo e execução de sessão (operação de desenvolvimento, sem equivalente em `dgk`).
- `marimo pair`: acesso ao notebook em execução, incluindo variáveis, células e UI, quando a skill do agente está instalada.
- ACP e MCP: integrações de editor/protocolo que devem ser tratadas como opcionais e verificadas contra a versão instalada do Marimo.
- AI do editor: usa chaves próprias configuradas no Marimo e pode gerar/refatorar células com contexto de variáveis em memória.

Essas opções são úteis, mas não são pré-requisito do Lab. A regra deste vault é: primeiro o fluxo local, versionado e revisável; depois integrações assistidas quando fizerem sentido.

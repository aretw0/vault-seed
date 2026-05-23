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
updated: 2026-05-23
category: guia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
  - "[[Usando com Agentes de IA]]"
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
- `99 - Meta e Anexos/Notebooks/starters/`: exemplos para copiar quando quiser criar um notebook próprio.

## Rodando Localmente

Se estiver no devcontainer, as dependências Python já são instaladas na criação do ambiente. Fora do devcontainer, instale o `uv`; os comandos do Lab usam `uv run --with-requirements requirements.txt`, então não dependem de um `marimo` global no `PATH`.

Use:

```bash
pnpm run notebooks:dev
```

O comando gera `public/lab/vault-data.json`, sobe apenas o servidor Marimo na porta `2718`, abre a pasta `99 - Meta e Anexos/Notebooks` e mantém o snapshot local atualizado enquanto você edita notas. Ele também usa `--watch`, então alterações feitas por VS Code, Codex, Claude ou Pi no arquivo `.py` podem ser recarregadas no editor do Marimo.

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

No uso local, `pnpm run notebooks:dev` gera `public/lab/vault-data.json` diretamente a partir das notas do vault. Durante o build do site, a integração Astro usa o mesmo gerador para criar o snapshot que será publicado.

Isso mantém o Lab em modo leitura: ele ajuda a enxergar o vault, mas não modifica notas automaticamente.

O Lab modifica apenas os notebooks que você edita. As notas Markdown do vault são lidas para gerar o snapshot `vault-data.json`.

## Idioma E Acentos

Este vault configura o Marimo com `locale = "pt-BR"` em `pyproject.toml`. Isso ajusta formatação de datas, números e tempos relativos quando o navegador e o Marimo suportam esse locale.

Essa configuração não traduz toda a interface do Marimo. Segundo a documentação oficial, textos da UI, mensagens de erro e documentação do Marimo ainda não são localizados. Por isso, os notebooks deste vault mantêm títulos, seções e labels em português, enquanto alguns controles internos do editor podem continuar em inglês.

Os notebooks leem `vault-data.json` com `encoding="utf-8"` para preservar acentos e tils em títulos e links.

## Tema Visual

O Marimo carrega `.site/styles/marimo-vault.css` via `custom_css` em `pyproject.toml`. Esse arquivo aproxima os notebooks da paleta verde-jardim do site, em modo claro e escuro.

A personalização atua sobre variáveis CSS usadas pelo Marimo, como `--background`, `--foreground`, `--primary`, `--accent`, `--border` e escalas `--slate-*`/`--grass-*`. A estrutura do editor continua sendo do Marimo; o vault controla a paleta e alguns detalhes de leitura, não substitui completamente o tema interno da ferramenta.

## Publicação

O workflow `.github/workflows/deploy-site.yml` exporta como HTML WebAssembly apenas os notebooks listados em `.site/lab.notebooks.json` com `publish: true`. Por padrão, eles ficam em `/lab/` junto com o site publicado.

No preview local do Astro, a página `/lab/` aparece, mas os notebooks exportados só existem depois do passo de deploy. Para testar a experiência interativa localmente, use `pnpm run notebooks:dev`.

## Criando Um Notebook

1. Copie um arquivo de `99 - Meta e Anexos/Notebooks/starters/`.
2. Renomeie a cópia dentro de `99 - Meta e Anexos/Notebooks/`.
3. Abra com `pnpm run notebooks:dev`.
4. Leia `vault-data.json` quando precisar analisar notas, tags, status ou links.

Você pode criar quantos notebooks quiser nessa pasta. Eles são arquivos Python versionados junto com o vault e continuam locais até entrarem no manifesto de publicação.

Fluxo recomendado:

1. Trabalhe localmente com `pnpm run notebooks:dev`.
2. Crie ou edite notebooks em `99 - Meta e Anexos/Notebooks/`.
3. Rode `pnpm run notebooks:data` quando quiser regenerar apenas o snapshot.
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

Se o agente precisa de feedback do runtime vivo, abra o notebook com `pnpm run notebooks:dev` e gere o prompt de pareamento:

```bash
pnpm run notebooks:pair -- --url URL_DO_MARIMO --codex
```

Troque `--codex` por `--claude` ou `--opencode` quando estiver usando outro agente compatível. Esse comando chama `marimo pair prompt`; ele não substitui o Git nem o diff, mas dá ao agente instruções para trabalhar com a sessão aberta.

Camadas disponíveis:

- `pnpm run notebooks:check`: feedback determinístico de arquivo e execução de sessão.
- `marimo pair`: acesso ao notebook em execução, incluindo variáveis, células e UI, quando a skill do agente está instalada.
- ACP e MCP: integrações de editor/protocolo que devem ser tratadas como opcionais e verificadas contra a versão instalada do Marimo.
- AI do editor: usa chaves próprias configuradas no Marimo e pode gerar/refatorar células com contexto de variáveis em memória.

Essas opções são úteis, mas não são pré-requisito do Lab. A regra deste vault é: primeiro o fluxo local, versionado e revisável; depois integrações assistidas quando fizerem sentido.

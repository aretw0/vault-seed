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

Se estiver no devcontainer, as dependências Python já são instaladas na criação do ambiente. Em instalação local fora do devcontainer, instale o `uv` e rode uma vez:

```bash
uv pip install -r requirements.txt
```

Os comandos do Lab também usam `uv run --with-requirements requirements.txt`, então funcionam mesmo quando o executável `marimo` não está no `PATH`.

Use:

```bash
pnpm run notebooks:dev
```

O comando gera `public/lab/vault-data.json`, abre o Marimo apontando para `99 - Meta e Anexos/Notebooks` e mantém o snapshot local atualizado enquanto você edita notas. No devcontainer, a porta `2718` já fica preparada para uso.

Se quiser só atualizar os dados sem abrir o Marimo, use:

```bash
pnpm run notebooks:data
```

## Como Os Dados Chegam Ao Notebook

No uso local, `pnpm run notebooks:dev` gera `public/lab/vault-data.json` diretamente a partir das notas do vault. Durante o build do site, a integração Astro usa o mesmo gerador para criar o snapshot que será publicado.

Isso mantém o Lab em modo leitura: ele ajuda a enxergar o vault, mas não modifica notas automaticamente.

## Publicação

O workflow `.github/workflows/deploy-site.yml` exporta como HTML WebAssembly apenas os notebooks listados em `.site/lab.notebooks.json` com `publish: true`. Por padrão, eles ficam em `/lab/` junto com o site publicado.

No preview local do Astro, a página `/lab/` aparece, mas os notebooks exportados só existem depois do passo de deploy. Para testar a experiência interativa localmente, use `pnpm run notebooks:dev`.

## Criando Um Notebook

1. Copie um arquivo de `99 - Meta e Anexos/Notebooks/starters/`.
2. Renomeie a cópia dentro de `99 - Meta e Anexos/Notebooks/`.
3. Abra com `pnpm run notebooks:dev`.
4. Leia `vault-data.json` quando precisar analisar notas, tags, status ou links.

Você pode criar quantos notebooks quiser nessa pasta. Eles são arquivos Python versionados junto com o vault e continuam locais até entrarem no manifesto de publicação.

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

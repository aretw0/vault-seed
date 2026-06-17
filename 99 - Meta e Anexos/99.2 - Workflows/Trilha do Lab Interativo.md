---
title: Trilha do Lab Interativo
aliases:
  - Primeiro Notebook Marimo
  - Usando o Lab pela Primeira Vez
tags:
  - meta/lab
  - meta/marimo
  - meta/workflow
  - meta/qualidade
status: published
created: 2026-06-17
updated: 2026-06-17
category: guia
audience: intermediário
related:
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Preparando Dados para o Lab]]"
  - "[[O Lab — Notebooks e Dados]]"
  - "[[Verificando a Configuração do Vault]]"
sidebar:
  order: 95
---

# Trilha do Lab Interativo

Este roteiro cobre a primeira experiência com o Lab: preparar os dados, abrir um notebook Marimo localmente, interagir com os dados reais do vault, exportar para HTML e comparar com a versão publicada no site.

Leva de 10 a 20 minutos. Funciona como verificação manual de que o pipeline local → export → publicado está íntegro.

---

## Antes de começar

O CI verifica automaticamente:

- Estrutura do vault e arquivos de onboarding presentes
- Wiki links dos arquivos de entrada resolvendo
- Lint de markdown e qualidade de texto

O que você verifica manualmente:

- Que o modo local mostra dados reais do seu vault — não dados mockados ou do vault-seed
- Que a reatividade funciona (sliders, filtros, células interdependentes)
- Que o HTML exportado carrega no navegador sem servidor

---

## Trilha 1 — Preparar os datasets

O Lab carrega dados de `dados/lab/`. Gere-os antes de abrir qualquer notebook:

```bash
dgk etl
```

- [ ] `dados/lab/perfil-do-vault.json` existe e foi gerado agora
- [ ] O campo `noteCount` reflete o número real de notas do seu vault
- [ ] `dados/lab/curadoria-ia.json` existe
- [ ] `dados/lab/outbox-publicacao.json` existe

Se `noteCount` for 0 ou muito baixo, verifique se as pastas do vault estão na raiz correta do repositório.

---

## Trilha 2 — Abrir um notebook no modo local

```bash
dgk lab etl-demo
```

O Marimo abre no navegador com o notebook `etl-demo.py`.

- [ ] A página carrega sem erro no navegador (sem tela branca ou "Connection refused")
- [ ] O cabeçalho mostra o número de notas e a contagem bate com `noteCount` do Trilha 1
- [ ] Gráficos e tabelas mostram dados do seu vault — não os dados de exemplo do vault-seed

Teste a reatividade:

- [ ] Se houver um filtro ou slider, ajuste-o e veja se as células dependentes atualizam
- [ ] Scroll até o final: sem células com traceback vermelho ou mensagem de erro

Feche o servidor com `Ctrl+C` no terminal quando terminar.

---

## Trilha 3 — Exportar para HTML e verificar

```bash
dgk lab export
```

- [ ] `public/lab/` existe e contém arquivos `.html`
- [ ] `public/lab/etl-demo.html` existe

Abra o HTML diretamente no navegador, sem servidor:

```text
# macOS / Linux: abra pelo explorador de arquivos ou pelo terminal
# Windows: clique duas vezes no arquivo, ou use:
start public/lab/etl-demo.html
```

- [ ] A página carrega sem erros de rede (sem "Failed to fetch" no console)
- [ ] Os dados aparecem — não uma tela de carregamento indefinida
- [ ] Se houver múltiplos notebooks, a navegação entre eles funciona
- [ ] O toggle de tema escuro/claro responde

---

## Trilha 4 — Verificar o Lab no site publicado

Após um deploy no GitHub Pages, abra `https://seu-usuario.github.io/seu-vault/lab/`:

- [ ] A página `/lab/` carrega e lista os notebooks disponíveis
- [ ] Abrir `etl-demo.html` diretamente: carrega sem servidor externo (modo WASM)
- [ ] Os dados são do snapshot do último deploy — se parecerem desatualizados, rode `dgk etl` localmente, exporte e faça um novo push para `main`
- [ ] Notebooks de apresentação: o botão "Slides" funciona e o layout em tela cheia abre corretamente

Se o Lab publicado mostrar dados muito diferentes dos dados locais: rode `dgk etl` e `dgk lab export` localmente, faça commit de `public/lab/` e push para `main`.

---

## Referência rápida

| Ação | Comando |
|---|---|
| Gerar todos os datasets | `dgk etl` |
| Abrir notebook no modo local | `dgk lab <nome>` |
| Exportar todos os notebooks para HTML | `dgk lab export` |
| Verificar notebooks formatados | `pnpm run notebooks:check` |
| Build completo do site com Lab | `pnpm run site:dev:lab` |
| Verificar ferramentas Python opcionais | `pnpm run notebooks:extract:check` |
| Instalar Chromium para scraping | `pnpm run notebooks:extract:browser` |

Para criar seu próprio notebook e integrá-lo ao Lab, veja [[Usando o Lab (Notebooks Marimo)]].

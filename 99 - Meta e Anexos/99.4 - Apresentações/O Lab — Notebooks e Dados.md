---
title: O Lab — Notebooks e Dados
aliases:
  - Apresentação Lab
  - O Lab Marimo
tags:
  - meta/apresentacao
  - meta/lab
  - meta/notebooks
status: published
created: 2026-06-14
updated: 2026-06-14
category: referencia
audience: todos
related:
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Preparando Dados para o Lab]]"
  - "[[Coletando Dados Locais com Scraping e OCR]]"
  - "[[Visão Geral do Vault Seed]]"
  - "[[Fluxo de Publicação]]"
  - "[[Integração com Agentes de IA]]"
---

# O Lab — Notebooks e Dados

O Lab é a área de notebooks interativos do vault. Notebooks Marimo vivem como arquivos `.py` no repositório — versionados, legíveis em diff e publicáveis como HTML WebAssembly sem servidor.

## Por que Marimo

Diferente do Jupyter, o notebook Marimo é Python puro. O grafo de dependências entre células garante execução determinística — sem estado oculto acumulado entre execuções. O arquivo é o notebook. O notebook é o arquivo.

## Três modos

| Modo | Onde roda | O que tem acesso |
| --- | --- | --- |
| `dgk lab <nome>` | Computador local | Filesystem, secrets, subprocess |
| `marimo run` | Servidor Python | Mesmo acesso local + HTTP |
| HTML WebAssembly | Navegador (Pyodide) | Dados bundled e APIs públicas |

O mesmo código fonte funciona nos três modos. A detecção de tier é automática via `lab_runtime_context()`.

## O pipeline de dados

As notas alimentam o snapshot `vault-data.json`. O ETL local transforma fontes adicionais (feeds, curadoria, outbox) em datasets declarados no manifesto `.site/lab.datasets.json`. Os notebooks consomem esses datasets via `read_lab_dataset()`.

## A apresentação interativa

A apresentação em slides está disponível no Lab publicado, gerada a partir do notebook `99 - Meta e Anexos/Notebooks/apresentacoes/o-lab.py`. Ela mostra o pipeline de dados, os modos de execução e o runtime context de forma navegável.

## Para saber mais

- [[Usando o Lab (Notebooks Marimo)]] — guia completo de uso local e publicação
- [[Preparando Dados para o Lab]] — contratos entre ETL, datasets e notebooks
- [[Coletando Dados Locais com Scraping e OCR]] — receitas para enriquecer os datasets locais

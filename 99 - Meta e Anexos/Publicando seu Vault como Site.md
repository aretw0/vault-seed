---
title: Publicando seu Vault como Site
aliases:
  - Site Publicado
  - Publicação do Vault
tags:
  - meta/site
  - meta/github-actions
  - meta/astro
status: published
created: 2026-05-22
updated: 2026-05-22
category: guia
audience: todos
related:
  - "[[Identidade Visual e Blocos de Interface]]"
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)]]"
---

# Publicando seu Vault como Site

O vault já vem com um site Astro configurado para GitHub Pages. A mesma estrutura que você usa para escrever notas também alimenta a versão publicada do vault.

## O Que É Publicado

Notas com `status: published` no frontmatter entram no site. Notas em rascunho continuam no repositório, mas não aparecem na navegação pública.

Anexos referenciados pelas notas publicadas são copiados para o build. O Lab também publica dados e notebooks quando o workflow de deploy roda.

## Como O Deploy Funciona

O workflow `.github/workflows/deploy-site.yml` roda em pushes para `main` e também pode ser iniciado manualmente pelo GitHub Actions.

Ele faz quatro coisas:

1. Instala as dependências do projeto.
2. Gera o site Astro.
3. Exporta os notebooks Marimo para o caminho `/lab/`.
4. Envia a pasta `dist/` para o GitHub Pages.

## Configuração Inicial No GitHub

No repositório do vault, habilite GitHub Pages com a origem "GitHub Actions". Depois disso, cada push em `main` publica uma nova versão do site.

Se você configurar um domínio customizado, o workflow detecta o domínio e ajusta a base do Astro. Sem domínio customizado, o site usa o endereço padrão `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`.

## Publicando Uma Nota

Adicione ou atualize o frontmatter:

```yaml
status: published
```

Faça commit e push para `main`. O histórico Git continua sendo o registro da mudança, e o site mostra o estado publicado depois que o workflow terminar.

## Relação Com O Lab

A página `/lab/` faz parte do site. Os notebooks interativos aparecem ali depois do deploy, porque são exportados pelo workflow e não pelo preview local do Astro.

## Identidade Visual

O site usa blocos pequenos e reaproveitáveis para evitar drift entre a home, os guias e o Lab. Veja [[Identidade Visual e Blocos de Interface]] para os princípios e as classes básicas disponíveis.


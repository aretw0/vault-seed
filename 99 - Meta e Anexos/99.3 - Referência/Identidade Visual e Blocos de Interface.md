---
title: Identidade Visual e Blocos de Interface
aliases:
  - UI do Vault
  - Blocos de Interface
  - Base Visual
  - Design do Vault Seed
tags:
  - meta/site
  - meta/ui
  - meta/design
status: draft
created: 2026-05-25
updated: 2026-05-25
category: guia
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[MOC Vault Seed]]"
---

# Identidade Visual e Blocos de Interface

O vault-seed é uma base flexível. Ele não tenta impor uma marca, uma tese
editorial ou um produto final. Ele entrega contratos pequenos para que um vault
possa virar site pessoal, blog simples, documentação coletiva ou cartão de
visita sem perder coerência visual.

A identidade vem de quatro camadas:

1. **Arquivos puros**: notas Markdown, frontmatter, anexos e dados pequenos.
2. **Organização navegável**: PARA, MOCs, sidebar publicada e metadados.
3. **Blocos de UI curados**: cartões, botões, badges, estados e callouts.
4. **Lab integrado**: notebooks publicados com navegação e tema compatíveis com
   o site.

## Princípios

### Pouco contrato, muita utilidade

Um bloco visual deve existir porque resolve um uso recorrente: destacar uma
nota, abrir um recurso, mostrar estado, agrupar links ou explicar um fluxo.
Evite criar componentes para casos que ainda não se repetiram.

### A mesma fonte alimenta dentro e fora

A nota deve continuar legível no Obsidian, no VS Code, no GitHub e no site.
Quando o site precisa de HTML, ele deve usar classes simples e opcionais, sem
transformar o vault em uma aplicação acoplada ao tema.

### Sem drift entre documentação e interface

Se a home, o Lab e os guias falam da mesma base, eles devem usar os mesmos
nomes e os mesmos blocos. Quando um bloco muda, a mudança deve aparecer no CSS
compartilhado em `.site/styles/custom.css`, não copiada página por página.

### Sem bloat

A base visual deve ser suficiente para publicar bem, não para substituir um
design system completo. O mínimo atual é:

- texto de abertura com `.vault-lead`;
- grades com `.vault-card-grid`;
- cartões com `.vault-card`;
- ações com `.vault-actions`;
- botões com `.vault-button`;
- estados com `.vault-status`;
- metadados com `.vault-badge`;
- callouts vindos da sintaxe do Obsidian.

## Exemplo de bloco

Use HTML simples quando uma página precisar de uma composição visual estável:

```html
<section class="vault-card-grid">
  <article class="vault-card">
    <span class="vault-card__eyebrow">Lab</span>
    <h2 class="vault-card__title">Notebooks junto do vault</h2>
    <p class="vault-card__body">
      Explore dados preparados sem separar análise, documentação e origem.
    </p>
    <div class="vault-actions">
      <a class="vault-button" href="/lab/">Abrir Lab</a>
    </div>
  </article>
</section>
```

No Obsidian e no GitHub isso continua sendo HTML comum dentro do Markdown. No
site, as classes recebem a camada visual curada.

## Como evoluir sem quebrar a base

Antes de criar um novo bloco, pergunte:

- isso aparece em mais de uma página ou fluxo?
- funciona sem JavaScript?
- continua legível como Markdown/HTML puro?
- usa tokens do Starlight em vez de cores soltas?
- pode ser explicado em poucas linhas?

Se a resposta for não, prefira conteúdo simples. O vault-seed deve ser exemplo
de si mesmo: organizado por dentro, publicável por fora e pequeno o bastante
para ser adaptado.

## Relação com o Lab

O Lab usa Marimo, mas não deve parecer outro produto. O shell de notebooks, o
seletor de tema recolhido e a navegação de notebooks publicados seguem a mesma
intenção do site Astro: orientar sem capturar a tela.

Slides são exceção: em apresentação, o conteúdo precisa respirar. Por isso os
slides usam o modo nativo do Marimo com menos chrome, enquanto notebooks comuns
recebem o shell do Lab.

---
title: O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)
alias:
  - Versionamento do Conhecimento
  - Ciclo de Vida do Conhecimento
tags:
  - meta/versionamento
  - meta/git
  - meta/workflow
status: published
created: 2023-10-27
updated: 2023-10-27
category: conceito
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Processo de Release]]"
  - "[[git-workflow]]"
---
# O Ciclo de Vida do Conhecimento: Versionamento para Jardineiros Digitais

No nosso jardim digital, o conhecimento não é estático; ele cresce, evolui e se transforma. Assim como um jardineiro cuida de suas plantas, nós cuidamos das nossas notas, e esse cuidado inclui registrar suas fases de desenvolvimento. É aqui que entra o "versionamento", uma forma de mapear a jornada do nosso conhecimento.

## Por Que Versionar o Conhecimento?

Pense no versionamento como um diário de bordo do seu jardim:

-   **Rastreabilidade:** Saber quando uma ideia floresceu (nova funcionalidade), quando uma praga foi controlada (correção de bug), ou quando uma seção inteira do jardim foi replanejada (mudança disruptiva).
-   **Organização:** Manter um registro claro das mudanças ajuda a entender a evolução do seu pensamento e do seu cofre.
-   **Colaboração (se aplicável):** Se você compartilha seu jardim, o versionamento permite que outros jardineiros entendam as novidades e se adaptem às mudanças.

## As Estações do Nosso Jardim: MAIOR.MENOR.PATCH

Assim como as estações influenciam o jardim, nossas mudanças se encaixam em três categorias principais:

### 🌻 PATCH: Pequenas Podas e Cuidados Diários

São as correções rápidas, os ajustes finos. Uma nota com um erro de digitação, um link quebrado que foi consertado, ou uma pequena melhoria na formatação. São mudanças que não alteram a essência da planta, apenas a deixam mais saudável.

-   **No Código:** Commits do tipo `fix:` (ex: `fix(nota): corrige erro de digitação em 'PARA'`) ou `refactor:` (ex: `refactor(estrutura): otimiza organização de links`).

### 🌱 MENOR: Novas Sementes e Pequenos Crescimentos

Representam a adição de algo novo e compatível com o que já existe. Uma nova nota sobre um conceito, um novo template para um tipo específico de pensamento, ou a expansão de uma ideia existente. O jardim ganha novas plantas, mas sua estrutura principal permanece a mesma.

-   **No Código:** Commits do tipo `feat:` (ex: `feat(conceito): adiciona nota sobre 'Zettelkasten'`).

### 🌳 MAIOR: Replanejamento e Grandes Transformações

São as mudanças mais significativas, que podem exigir um replanejamento de como você interage com seu jardim. Uma reestruturação completa de uma área de conhecimento, uma mudança fundamental na forma como você organiza suas notas, ou a adoção de uma nova metodologia que impacta todo o cofre. Essas mudanças podem exigir que você "reorganize" algumas de suas plantas existentes.

-   **No Código:** Commits que incluem `BREAKING CHANGE:` no corpo da mensagem ou `!` no tipo (ex: `feat(estrutura)!: reorganiza pastas de 'Recursos'` ou `refactor(estrutura): reorganiza pastas de 'Recursos'\n\nBREAKING CHANGE: A estrutura de pastas foi alterada, atualize seus links internos.`).

## O Diário de Bordo Automatizado: `CHANGELOG.md`

Para nos ajudar a manter esse registro, temos um "diário de bordo" automatizado, o `CHANGELOG.md`. Ele é atualizado automaticamente com base nas nossas "ações de jardinagem" (commits), categorizando as mudanças em cada "estação" (release). É importante notar que apenas as "ações de jardinagem" mais relevantes (commits do tipo `feat:`, `fix:`, `refactor:` e `BREAKING CHANGE:`) aparecem neste diário, mantendo-o focado no que importa para a evolução do seu conhecimento.

## Publicando Nossas Colheitas: O Processo de Release

Quando decidimos que uma "colheita" de conhecimento está pronta para ser compartilhada (ou para marcar um ponto importante no desenvolvimento do nosso jardim), criamos um "release".

1.  **Registrando a Colheita:** Usamos uma ferramenta que analisa nossas "ações de jardinagem" (commits) e atualiza o diário de bordo (`CHANGELOG.md`) e a "versão da colheita" (`VERSION`).
2.  **Controle de Qualidade da Colheita (O "Guarda"):** Antes de publicar, um "guarda" automatizado verifica se a colheita contém mudanças significativas (commits `feat:`, `fix:`, `refactor:` ou `BREAKING CHANGE:`). Se a colheita for considerada "vazia" (sem mudanças relevantes para o diário de bordo), o guarda impede a publicação, garantindo que cada release seja valiosa.
3.  **Marcando a Colheita:** Uma "etiqueta" (`tag` Git) é colocada na colheita para identificá-la unicamente (ex: `v1.0.0`).
4.  **Compartilhando no Pomar Global (GitHub):** Quando enviamos essa etiqueta para o GitHub, um "assistente" automatizado (GitHub Actions) cria um registro oficial da nossa colheita, tornando-a visível para outros jardineiros (se o cofre for público ou compartilhado).

## O Canteiro de Integração: O Branch `develop`

Para gerenciar o fluxo de novas "plantas" (funcionalidades e correções) antes que elas cheguem ao jardim principal (`main`), utilizamos um "canteiro de integração" especial: o branch `develop`. Todas as novas ideias e desenvolvimentos são primeiro cultivados e testados neste canteiro, garantindo que estejam maduros antes de serem transplantados para o `main`.

## Cultivando com Propósito

Entender o versionamento é mais do que apenas números; é sobre cultivar seu conhecimento com propósito, registrando sua evolução e facilitando a navegação por seu jardim digital.

---

**Próximos Passos:**

Compreendendo o ciclo de vida do conhecimento, o próximo passo é ver como essa automação se traduz em um "assistente" (workflow de GitHub Actions) que nos ajuda a publicar nossas colheitas no GitHub. Para detalhes técnicos sobre como o processo de release funciona, incluindo a automação e o "guarda", consulte o documento [Processo de Release e Versionamento](docs/processo-de-release.md). Para uma visão completa da nossa estratégia de branches e merges, incluindo o papel do branch `develop`, consulte o [Fluxo de Trabalho Git: Estratégia de Branches e Merges](docs/git-workflow.md).
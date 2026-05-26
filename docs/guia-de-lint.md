# Guia de Lint: Mantendo a Qualidade do seu Jardim Digital

Este guia explica como funciona o processo de *linting* no seu vault, garantindo que suas notas mantenham um padrão de qualidade consistente sem impedir seu fluxo de trabalho criativo.

## O que é Lint?

*Linting* é o processo de análise de código (ou, no nosso caso, de texto em Markdown) para encontrar erros de formatação, inconsistências e desvios de estilo. Pense nele como um revisor automático que ajuda a manter a organização e a legibilidade do seu conhecimento.

**Analogia:** Imagine que cada nota é um livro em uma biblioteca. O linter é o bibliotecário que verifica se a capa, a lombada e a formatação interna de cada livro seguem o padrão da biblioteca, facilitando a vida de quem for consultá-lo no futuro.

## A Filosofia do Lint Gradual

Adotamos uma abordagem de "lint gradual", que aplica diferentes níveis de rigor dependendo de onde a nota se encontra no seu vault. A ideia é dar liberdade total na captura de ideias e aumentar a exigência de organização à medida que o conhecimento é refinado.

1.  **`00 - Entrada` (Caixa de Entrada):** Nenhuma regra de lint é aplicada aqui. Este é seu espaço para capturar ideias livremente, sem se preocupar com formatação.
2.  **Pastas de Conteúdo (`10` a `50`, `99`):** Ao mover uma nota do Inbox para uma das pastas do método PARA, regras de lint mais estritas são aplicadas. Isso garante que o conhecimento consolidado seja bem estruturado.
3.  **`docs/` e `90 - Modelos/`:** Essas pastas possuem um conjunto de regras mais flexível, pois servem a propósitos diferentes (documentação e modelos), onde certas regras de formatação de notas não se aplicam.

## Como Funciona na Prática (CI/CD)

O processo de lint é automatizado através de um workflow de Integração Contínua (CI) no GitHub Actions (`.github/workflows/ci.yml`). Toda vez que você envia uma alteração (`push`) ou abre uma Proposta de Melhoria (`pull request`), o workflow instala as dependências com `pnpm` e executa a régua canônica:

```bash
pnpm run validate
```

Essa régua inclui o lint do vault principal, lint dos modelos, auditoria de arquitetura de informação, auditoria da sidebar, testes dos scripts, validação de onboarding, revisão de português, contraste dos temas e Mermaid. No repositório original do template, a validação também cobre documentação técnica e smokes internos do template.

Se qualquer etapa encontrar um erro, o workflow falhará, impedindo que alterações fora do padrão sejam integradas. Isso serve como um "Rascunho Seguro" (Branch) que protege a qualidade do seu repositório principal.

## Como Lidar com Erros de Lint

Se o workflow apontar um erro, você pode:

1.  **Corrigir o Erro:** A melhor abordagem é ajustar a formatação da sua nota para seguir a regra.
2.  **Desabilitar uma Regra Temporariamente:** Se uma regra específica não faz sentido para uma linha ou um arquivo inteiro, você pode desabilitá-la localmente.

    *   **Para uma única linha:**

        ```markdown
        <!-- markdownlint-disable-next-line MD013 -->
        Esta linha é muito, muito, muito, muito, muito, muito, muito, muito longa.
        ```

    *   **Para um arquivo inteiro:** Adicione no topo do arquivo.

        ```markdown
        <!-- markdownlint-disable MD013 -->
        ```

    *   **Para múltiplas regras:**

        ```markdown
        <!-- markdownlint-disable-file MD013 MD041 -->
        ```

## Configuração Avançada

Você pode personalizar o comportamento do lint editando os arquivos de configuração:

*   **`.markdownlint.json`:** Contém as regras principais para as notas do dia a dia.
*   **`docs/.markdownlint.json`:** Regras para a documentação. Ele herda as regras do arquivo principal através da chave `"extends": "../.markdownlint.json"` e apenas modifica o que for necessário.
*   **`90 - Modelos/.markdownlint.json`:** Mesma lógica, para os templates.

Para ignorar uma pasta inteira, você pode ajustar os comandos nos scripts `lint:*` dentro do `package.json` ou no workflow `ci.yml`.

Antes de abrir uma Proposta de Melhoria, rode:

```bash
pnpm run validate
```

Esse comando combina lint, auditorias de arquitetura de informação e sidebar, testes dos scripts, validação de onboarding, revisão de português, contraste dos temas e Mermaid. O objetivo é pegar problemas que afetam o usuário final, como links quebrados no onboarding, notas publicadas fora da navegação, metadados incompletos ou diagramas que deixariam de renderizar.

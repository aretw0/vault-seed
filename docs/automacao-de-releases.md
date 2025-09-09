# Automação de Releases no Projeto

Este documento detalha a estratégia de automação de releases (lançamentos) utilizada neste projeto (template). Nosso objetivo é garantir um processo de lançamento consistente, transparente e eficiente, desde o desenvolvimento até a publicação no GitHub.

## Ferramentas Utilizadas

Utilizamos as seguintes ferramentas para automatizar nosso processo de release:

-   **Conventional Commits:** Um conjunto de regras para criar mensagens de commit explícitas, que se integram com ferramentas de automação. Isso nos permite gerar CHANGELOGs e determinar o tipo de bump de versão automaticamente.
-   **`standard-version`:** Uma ferramenta que automatiza o processo de versionamento e geração de CHANGELOGs com base nas mensagens de commit do Conventional Commits. Ela também cria tags Git para cada release.
-   **GitHub Actions:** Nossa plataforma de CI/CD que orquestra o fluxo de trabalho de release, desde a execução do `standard-version` até a criação do release no GitHub.

## Fluxo de Trabalho de Release

O processo de release segue os seguintes passos automatizados:

1.  **Desenvolvimento e Commits:**
    *   Os desenvolvedores trabalham em novas funcionalidades, correções de bugs ou melhorias, seguindo as diretrizes de Conventional Commits para suas mensagens de commit.

2.  **Geração da Versão e CHANGELOG:**
    *   Quando um release é desejado, o comando `npm run release` (que executa `standard-version`) é invocado.
    *   `standard-version` analisa as mensagens de commit desde o último release, determina o próximo número de versão (patch, minor ou major), atualiza o arquivo `VERSION`, gera ou atualiza o `CHANGELOG.md` e cria uma tag Git (ex: `v1.0.0`).
    *   Um commit é criado localmente contendo as atualizações do `VERSION` e `CHANGELOG.md`.

3.  **Publicação no GitHub:**
    *   O desenvolvedor então faz `git push --follow-tags origin main` para enviar os commits e a nova tag para o repositório remoto no GitHub.
    *   Um workflow de GitHub Actions (a ser implementado) será acionado por essa nova tag.
    *   Este workflow extrairá as notas de release do `CHANGELOG.md` para a versão correspondente e criará um novo Release no GitHub, associado à tag recém-criada.

## Benefícios da Automação

-   **Consistência:** Garante que todas as releases sigam o mesmo padrão de versionamento e documentação.
-   **Transparência:** O `CHANGELOG.md` é sempre atualizado com base nas contribuições, fornecendo um histórico claro das mudanças.
-   **Eficiência:** Reduz o esforço manual e o potencial de erros no processo de release.

---

**Próximos Passos:**

A implementação do workflow de GitHub Actions para a criação automática de releases no GitHub será o próximo passo.

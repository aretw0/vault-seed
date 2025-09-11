# Processo de Release e Versionamento

Este documento detalha como as releases são geradas e versionadas neste repositório, garantindo clareza e previsibilidade para todos os colaboradores.

## 1. Versionamento Semântico (SemVer)

Adotamos o Versionamento Semântico (SemVer) no formato `MAJOR.MINOR.PATCH`. Isso significa:

*   **MAJOR (X.0.0):** Incrementado para mudanças que quebram a compatibilidade (breaking changes).
*   **MINOR (0.Y.0):** Incrementado para novas funcionalidades adicionadas de forma retrocompatível.
*   **PATCH (0.0.Z):** Incrementado para correções de bugs retrocompatíveis.

## 2. Conventional Commits e o Changelog

Utilizamos Conventional Commits para padronizar as mensagens de commit. Isso nos permite gerar automaticamente o `CHANGELOG.md` e determinar o tipo de incremento da versão.

**Tipos de Commit que Geram Entradas no Changelog ("Changelog-Worthy"):

Para que uma alteração apareça no `CHANGELOG.md` e seja considerada para uma nova release, o commit deve iniciar com um dos seguintes tipos:

*   `feat:` **(Feature)**: Para novas funcionalidades.
*   `fix:` **(Bug Fix)**: Para correção de bugs.
*   `refactor:` **(Code Refactoring)**: Para refatorações de código que não adicionam funcionalidades nem corrigem bugs, mas melhoram a estrutura ou legibilidade.
*   `BREAKING CHANGE:`: Uma linha separada no corpo do commit que indica uma mudança que quebra a compatibilidade.

**Exemplos de Commits que NÃO Geram Entradas no Changelog (Internos/Não-Usuário):

Commits com os seguintes tipos são importantes para o histórico do projeto, mas não aparecerão no `CHANGELOG.md` por padrão, pois não representam mudanças diretas para o usuário final:

*   `chore:` (Tarefas de manutenção, como atualizações de dependências)
*   `docs:` (Alterações na documentação)
*   `style:` (Formatação de código, sem mudança de lógica)
*   `perf:` (Melhorias de performance)
*   `test:` (Adição ou correção de testes)
*   `build:` (Alterações no sistema de build ou dependências externas)
*   `ci:` (Alterações nos arquivos e scripts de CI/CD)

## 3. O "Guarda" da Release: Evitando Releases Vazias

Para garantir que cada release tenha um `CHANGELOG.md` significativo, implementamos um "guarda" no workflow de CI/CD.

**Regra:** Uma release **só será gerada** se houver pelo menos um commit do tipo `feat`, `fix`, `refactor` ou `BREAKING CHANGE` desde a última release.

**O que acontece se não houver commits relevantes:**

Se você tentar gerar uma release e não houver commits "changelog-worthy" desde a última versão, o workflow de release no GitHub Actions irá **falhar** na etapa "Verificar Commits para Changelog". Isso é intencional e serve para:

*   **Prevenir Releases Vazias:** Evita que versões sejam publicadas sem conteúdo novo ou relevante no changelog.
*   **Manter a Qualidade:** Garante que cada incremento de versão corresponda a uma mudança significativa para o usuário.
*   **Orientar o Colaborador:** Sinaliza que o tipo de commit utilizado não é suficiente para justificar uma nova release.

**Mensagem de Erro:** Você verá uma mensagem de erro no log do GitHub Actions indicando que "Nenhum commit do tipo 'feat', 'fix', 'refactor' ou 'BREAKING CHANGE' encontrado desde a última release."

## 4. Como Gerar uma Nova Release

Siga estes passos para criar e publicar uma nova release:

1.  **Faça Commits Relevantes:** Certifique-se de que suas alterações incluam pelo menos um commit do tipo `feat`, `fix`, `refactor` ou `BREAKING CHANGE`.
2.  **Gere a Nova Versão e Tag Localmente:**
    ```bash
    npm run release
    ```
    Este comando irá:
    *   Incrementar a versão (patch, minor ou major, dependendo dos seus commits).
    *   Atualizar o `CHANGELOG.md`.
    *   Criar um novo commit com as alterações do changelog e da versão.
    *   Criar uma nova tag Git (ex: `v1.0.0`).
3.  **Envie as Alterações para o GitHub:**
    ```bash
    git push --follow-tags origin main
    ```
    Este comando enviará o novo commit e a tag para o repositório remoto, o que irá disparar o workflow de release no GitHub Actions.

4.  **Verifique o Status da Release:**
    Acompanhe o progresso do workflow na aba "Actions" do seu repositório no GitHub. Se tudo estiver correto, uma nova release será criada automaticamente.

## 5. Dicas e Boas Práticas

*   **Commits Atômicos:** Faça commits pequenos e focados em uma única mudança.
*   **Mensagens Claras:** Escreva mensagens de commit descritivas e que sigam a convenção.
*   **Teste Localmente:** Antes de gerar uma release, certifique-se de que suas mudanças estão funcionando como esperado.

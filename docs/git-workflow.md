# Fluxo de Trabalho Git: Estratégia de Branches e Merges

Este documento detalha a estratégia de branches e merges utilizada neste repositório, baseada em um GitHub Flow modificado, com o objetivo de manter um histórico Git limpo, um branch principal (`main`) sempre estável e um ponto de integração (`develop`) para novas funcionalidades.

## 1. Branches Principais

*   **`main`:**
    *   Representa o código **pronto para produção** e sempre estável.
    *   Todas as releases são feitas a partir deste branch.
    *   Apenas Pull Requests (PRs) do branch `develop` (ou `hotfix` em casos emergenciais) podem ser mesclados diretamente em `main`.
    *   **Histórico:** Mantido o mais linear e limpo possível através de estratégias de merge como "Squash and Merge" ou "Rebase and Merge".

*   **`develop`:**
    *   Serve como um branch de **integração** para novas funcionalidades e correções.
    *   Todos os branches de `feature` são mesclados neste branch.
    *   Quando um conjunto de funcionalidades está pronto para uma release, `develop` é mesclado em `main` via PR.
    *   **Histórico:** Agrega os commits de `feature` branches, mantendo-os organizados através de "Squash and Merge".

## 2. Branches de Suporte

*   **`feature/<nome-da-feature>`:**
    *   Criados a partir de `develop` para desenvolver novas funcionalidades ou grandes correções.
    *   Devem ser de **curta duração** e focados em uma única tarefa.
    *   Mesclados em `develop` via Pull Request.
    *   **Convenção de Nomenclatura:** `feature/<descrição-curta-da-feature>` (ex: `feature/nova-autenticacao`).

*   **`bugfix/<nome-da-correcao>`:**
    *   Criados a partir de `develop` para corrigir bugs não críticos.
    *   Mesclados em `develop` via Pull Request.
    *   **Convenção de Nomenclatura:** `bugfix/<descrição-curta-do-bug>` (ex: `bugfix/erro-login`).

*   **`hotfix/<nome-da-correcao>`:**
    *   Criados a partir de `main` para corrigir bugs **críticos** em produção.
    *   Devem ser mesclados tanto em `main` quanto em `develop` via Pull Request.
    *   **Convenção de Nomenclatura:** `hotfix/<descrição-curta-do-hotfix>` (ex: `hotfix/falha-critica-api`).

## 3. Fluxo de Trabalho

1.  **Início de uma Nova Feature/Correção:**
    *   Crie um novo branch de `feature` (ou `bugfix`) a partir de `develop`:
        ```bash
        git checkout develop
        git pull origin develop # Garanta que seu develop está atualizado
        git checkout -b feature/minha-nova-feature
        ```
2.  **Desenvolvimento:**
    *   Faça suas alterações e commits no branch de `feature`. Siga a convenção de [Conventional Commits](CONTRIBUTING.md).
3.  **Submissão para Revisão:**
    *   Envie seu branch para o repositório remoto:
        ```bash
        git push origin feature/minha-nova-feature
        ```
    *   Abra uma Pull Request no GitHub (ou Gitea) do seu branch de `feature` para o branch `develop`.
4.  **Revisão e Testes:**
    *   O PR será revisado por outros colaboradores (se houver) e passará pelas verificações automatizadas de CI/CD.
5.  **Mesclagem (Merge):**
    *   Após a aprovação e a passagem de todas as verificações, o PR será mesclado em `develop` usando a estratégia **"Squash and Merge"**. Isso garante que o histórico de `develop` seja limpo, com cada feature representada por um único commit.
6.  **Release (de `develop` para `main`):**
    *   Quando um conjunto de funcionalidades no `develop` estiver pronto para ser lançado, um Pull Request será aberto de `develop` para `main`.
    *   Este PR também passará por revisão e verificações de CI/CD.
    *   A mesclagem em `main` será feita usando **"Squash and Merge"** ou **"Rebase and Merge"** para manter o histórico de `main` perfeitamente linear e limpo.
    *   A criação da tag de release e a publicação no GitHub serão feitas automaticamente pelo workflow de release.

## 4. Estratégias de Merge

Para manter o histórico limpo e legível, configuraremos o repositório para permitir apenas as seguintes estratégias de merge para Pull Requests:

*   **Squash and Merge:** Recomendado para mesclar branches de `feature` em `develop` e de `develop` em `main`. Ele condensa todos os commits de um PR em um único commit no branch de destino.
*   **Rebase and Merge:** Uma alternativa para mesclar `develop` em `main`. Ele reescreve o histórico do branch de origem para que ele apareça como se tivesse sido desenvolvido diretamente no branch de destino, resultando em um histórico perfeitamente linear.

**Configuração no GitHub/Gitea:**

Para aplicar estas estratégias, o administrador do repositório deve:

1.  Ir para `Settings` (Configurações) -> `General` (Geral) -> `Merge button` (Botão de mesclagem).
2.  **Desmarcar:** `Allow merge commits` (Permitir commits de mesclagem).
3.  **Marcar:** `Allow squash merging` (Permitir mesclagem por squash).
4.  **Marcar (Opcional, mas recomendado):** `Allow rebase merging` (Permitir mesclagem por rebase).

## 5. Proteção de Branches

Para garantir a adesão a este fluxo de trabalho, as seguintes regras de proteção de branch serão aplicadas em `main` e `develop`:

*   **`main`:**
    *   Exigir Pull Request para mesclagem.
    *   Exigir aprovações (1 ou mais).
    *   Exigir que as verificações de status passem.
    *   Incluir administradores nas regras.
    *   Não permitir ignorar as configurações acima.
*   **`develop`:**
    *   Exigir Pull Request para mesclagem.
    *   Exigir aprovações (1 ou mais, pode ser menos rigoroso que `main`).
    *   Exigir que as verificações de status passem.
    *   Incluir administradores nas regras.
    *   Não permitir ignorar as configurações acima.

---

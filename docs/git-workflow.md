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

Para garantir a adesão a este fluxo de trabalho, as regras de proteção de branch são aplicadas em `main` e `develop`. Elas funcionam como uma "cerca de segurança" para as branches mais importantes. Abaixo estão as regras recomendadas e como configurá-las no GitHub.

### Configurando as Regras

1.  Acesse a página de configuração de branches: `Settings` > `Branches`.
2.  Clique em **"Add branch protection rule"**.

#### Regra para `main`

*   **Branch name pattern:** Digite `main`.
*   Marque **"Require a pull request before merging"**.
    *   Dentro dela, marque **"Require approvals"** e deixe o número como `1`.
*   Marque **"Require status checks to pass before merging"**.
    *   Dentro dela, marque **"Require branches to be up to date before merging"**.
*   Marque **"Do not allow bypassing the above settings"**.
*   Clique em **"Create"**.

#### Regra para `develop`

*   Clique em **"Add branch protection rule"** novamente.
*   **Branch name pattern:** Digite `develop`.
*   Marque **"Require a pull request before merging"**.
    *   Opcional: Marque **"Require approvals"** com `1` se desejar o mesmo rigor da `main`.
*   Marque **"Require status checks to pass before merging"**.
*   Clique em **"Create"**.

---

### 7. Limpeza de Branches

Após uma Pull Request ser mesclada (seja de `feature` para `develop`, ou de `develop` para `main`), a branch de origem (a `feature` ou `develop` que foi mesclada) geralmente não é mais necessária. Mantê-las pode poluir o histórico de branches e o ambiente de desenvolvimento.

**Processo de Limpeza:**

1.  **Excluir a Branch Remota:**
    *   Após a mesclagem de uma Pull Request no GitHub (ou plataforma similar), a interface geralmente oferece uma opção para "Delete branch" (Excluir branch). É recomendado fazer isso para manter o repositório remoto limpo.
    *   Alternativamente, via linha de comando:
        ```bash
        git push origin --delete <nome-da-branch>
        ```
2.  **Excluir a Branch Local:**
    *   Certifique-se de que você não está na branch que deseja excluir. Mude para `develop` ou `main`.
    *   Exclua a branch localmente:
        ```bash
        git branch -d <nome-da-branch>
        ```
        *   O comando `-d` (ou `--delete`) só funciona se a branch já foi totalmente mesclada.
        *   Se houver commits não mesclados e você quiser forçar a exclusão (com perda de dados), use `-D` (ou `--delete --force`):
            ```bash
            git branch -D <nome-da-branch>
            ```
3.  **Limpar Referências Remotas Obsoletas (Pruning):**
    *   Às vezes, mesmo após a exclusão de uma branch remota, sua referência local (`origin/<nome-da-branch>`) pode persistir. Para limpar essas referências obsoletas:
        ```bash
        git fetch --prune
        # Ou, para uma limpeza mais específica:
        git remote prune origin
        ```
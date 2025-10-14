# Processo de Release e Versionamento

Este documento detalha como as releases são geradas e versionadas, garantindo clareza e previsibilidade. O processo difere entre o uso do vault como um cofre pessoal e a manutenção do template original.

## 1. Versionamento Semântico (SemVer)

Adotamos o Versionamento Semântico (SemVer) no formato `MAJOR.MINOR.PATCH`:

*   **MAJOR (X.0.0):** Para mudanças que quebram a compatibilidade (breaking changes).
*   **MINOR (0.Y.0):** Para novas funcionalidades adicionadas de forma retrocompatível.
*   **PATCH (0.0.Z):** Para correções de bugs retrocompatíveis.

## 2. Conventional Commits e o Changelog

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/) para padronizar as mensagens de commit. Isso nos permite gerar automaticamente o `CHANGELOG.md` e determinar o tipo de incremento da versão. Os tipos que geram entradas no changelog são `feat`, `fix`, e `refactor`. Commits marcados com `BREAKING CHANGE` indicarão um incremento `MAJOR`.

## 3. Como Gerar uma Nova Release

Existem dois processos distintos para gerar uma release, dependendo do seu contexto.

### 3.1. Para Usuários do Vault (Processo Padrão e Local)

Se você usou este repositório como um template para seu próprio cofre de conhecimento, este é o processo recomendado para você. Ele é simples e executado localmente.

1.  **Faça Commits Relevantes:** Certifique-se de que suas alterações incluam pelo menos um commit do tipo `feat`, `fix`, ou `refactor`.
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
    Este comando enviará o novo commit e a tag para seu repositório, mantendo seu histórico de versões organizado.

### 3.2. Para Mantenedores do Template (Processo Automatizado via GitHub)

Este processo é exclusivo para a manutenção do repositório `aretw0/vault-seed` e utiliza automações (GitHub Actions) para garantir a integridade do template.

1.  **Certifique-se que `develop` está pronto:** Verifique se todas as funcionalidades e correções desejadas foram mescladas no branch `develop`.
2.  **Inicie a Preparação da Release:**
    *   Navegue até a aba **Actions** do repositório `aretw0/vault-seed`.
    *   Na lista de workflows à esquerda, selecione **"Prepare Release PR"**.
    *   Clique no botão **"Run workflow"**, garantindo que o branch `main` esteja selecionado, e execute o workflow.
3.  **Aguarde o Pull Request:** O workflow irá automaticamente:
    *   Criar um branch de release temporário a partir da `main` e mesclar a `develop` nele.
    *   Executar o `standard-version` para gerar o `CHANGELOG.md` e a nova versão.
    *   Abrir um Pull Request (PR) no repositório com o título `chore(release): vX.X.X`.
4.  **Revise e Mescle o PR:**
    *   Revise as alterações no Pull Request, especialmente o `CHANGELOG.md`, para garantir que tudo está correto.
    *   Após a aprovação, mescle o PR no branch `main`.
5.  **Publicação Automática:**
    *   O merge na `main` acionará o workflow **"Publish Release"**.
    *   Este workflow irá automaticamente criar a tag Git e publicar uma nova Release no GitHub, contendo as notas extraídas do `CHANGELOG.md`.

### 3.3. Processos de Release Manual (Fallback)

Existem duas situações principais onde um processo manual pode ser necessário. Escolha a que se aplica ao seu caso.

#### Cenário 1: O workflow `Publish Release` falhou

Use este guia se o Pull Request do `prepare-release-pr` foi mesclado, mas a criação da release final falhou. Nesse ponto, a versão e o `CHANGELOG.md` já foram atualizados, então precisamos apenas criar a tag e a release.

1.  **Sincronize a `main` e extraia as informações:**

    ```bash
    git checkout main
    git pull origin main

    # Extrai a versão do package.json
    VERSION=$(node -p "require('./package.json').version")
    echo "Versão a ser lançada: v$VERSION"

    # Extrai as notas de release do CHANGELOG.md (requer awk)
    NOTES=$(awk '/^## / && c++>0 {exit} c>0 {print}' CHANGELOG.md)
    echo "Notas da release extraídas."
    ```

2.  **Crie a Tag e a Release com o GitHub CLI:**
    Você precisa ter o [GitHub CLI (`gh`)](https://cli.github.com/) instalado e autenticado (`gh auth login`).

    ```bash
    # Cria a tag localmente
    git tag -a "v$VERSION" -m "chore(release): v$VERSION"

    # Empurra a tag para o repositório remoto
    git push origin "v$VERSION"

    # Cria a release no GitHub usando as notas extraídas
    gh release create "v$VERSION" --title "v$VERSION" --notes "$NOTES"
    
    echo "Release v$VERSION criada com sucesso no GitHub!"
    ```

#### Cenário 2: Nenhum workflow de release pode ser executado

Use este guia se você precisa fazer uma release completa localmente, sem a ajuda dos workflows `prepare-release-pr` ou `Publish Release`.

1.  **Sincronize e mescle `develop` na `main`:**
    Certifique-se de que `main` e `develop` estão atualizadas e então mescle as últimas alterações na `main`.
    ```bash
    git checkout develop
    git pull origin develop
    git checkout main
    git pull origin main
    git merge develop
    ```

2.  **Execute o `standard-version` para criar a release:**
    Este comando irá ler os novos commits, determinar a versão, gerar o `CHANGELOG.md`, commitar as mudanças e criar a tag.
    ```bash
    npm run release
    ```

3.  **Empurre as mudanças e a tag para o repositório:**
    ```bash
    # Empurra o commit da release e a nova tag
    git push --follow-tags origin main
    ```

4.  **Crie a Release no GitHub:**
    O passo final é criar a release na interface do GitHub para que as notas fiquem visíveis. Você pode usar o GitHub CLI (`gh`) para isso.
    
    ```bash
    # Extraia a versão e as notas
    VERSION=$(node -p "require('./package.json').version")
    NOTES=$(awk '/^## / && c++>0 {exit} c>0 {print}' CHANGELOG.md)

    # Crie a release no GitHub
    gh release create "v$VERSION" --title "v$VERSION" --notes "$NOTES"
    
    echo "Release v$VERSION criada com sucesso no GitHub!"
    ```

## 4. Dicas e Boas Práticas

*   **Commits Atômicos:** Faça commits pequenos e focados em uma única mudança.
*   **Mensagens Claras:** Escreva mensagens de commit descritivas e que sigam a convenção.
*   **Teste Localmente:** Antes de gerar uma release, certifique-se de que suas mudanças estão funcionando como esperado.
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
2.  **Crie um changeset descrevendo a mudança:**
    ```bash
    pnpm changeset
    ```
    O prompt interativo pedirá o tipo de bump (patch/minor/major) e uma descrição curta.
3.  **Gere a Nova Versão Localmente:**
    ```bash
    pnpm changeset version
    ```
    Este comando irá:
    *   Ler os changesets pendentes e determinar o próximo número de versão.
    *   Atualizar o `package.json` e o `CHANGELOG.md`.
    Depois, commite as mudanças:
    ```bash
    git add -A && git commit -m "chore(release): v$(node -p "require('./package.json').version")"
    ```
4.  **Envie as Alterações para o GitHub:**
    ```bash
    VERSION=$(node -p "require('./package.json').version")
    git push origin main
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
    ```
    Estes comandos enviam o novo commit e a tag para seu repositório, mantendo seu histórico de versões organizado.

### 3.2. Para Mantenedores do Template (Processo Automatizado via GitHub)

Este processo é exclusivo para a manutenção do repositório `aretw0/vault-seed` e utiliza automações (GitHub Actions) para garantir a integridade do template.

1.  **Certifique-se que `develop` está pronto:** Verifique se todas as funcionalidades e correções desejadas foram mescladas no branch `develop`.
2.  **Inicie a Preparação da Release:**
    *   Navegue até a aba **Actions** do repositório `aretw0/vault-seed`.
    *   Na lista de workflows à esquerda, selecione **"Prepare Release PR"**.
    *   Clique no botão **"Run workflow"**, garantindo que o branch `develop` esteja selecionado, e execute o workflow. Isso garante que a versão mais recente do próprio workflow de release seja usada.
3.  **Aguarde o Pull Request:** O workflow irá automaticamente:
    *   Criar um branch de release temporário a partir da `develop`, gerar a versão nele e abrir um PR para `main`.
    *   Executar `pnpm changeset version` para gerar o `CHANGELOG.md` e a nova versão.
    *   Abrir um Pull Request (PR) no repositório com o título `chore(release): vX.X.X`. Este PR é configurado para excluir o branch de release automaticamente após o merge.
4.  **Revise e Mescle o PR:**
    *   Revise as alterações no Pull Request, especialmente o `CHANGELOG.md`, para garantir que tudo está correto.
    *   Após a aprovação, mescle o PR no branch `main`.
5.  **Publicação Automática (template + pacotes npm):**
    *   O merge na `main` aciona o workflow **"Publish Release"** (`release.yml`).
    *   O workflow valida a árvore (`pnpm run validate`), cria a tag `vX.Y.Z`, publica a Release no GitHub com as notas extraídas do `CHANGELOG.md` e roda `pnpm changeset publish`. Esse último passo publica no npm os pacotes do workspace (`@aretw0/dgk-cli`, `@aretw0/dgk-channels`, `@aretw0/dgk-runner`, `@aretw0/dgk-skills`, `@aretw0/dgk-astro-plugins`) cuja versão ainda não existe no registry; pacotes já publicados são pulados (operação idempotente).

6.  **Publicação do pacote Python (`dgk-lab-runtime`):**
    *   O pacote PyPI **não** é versionado por changesets nem publicado pelo "Publish Release" — ele tem uma trilha de versionamento própria e manual.
    *   Ao alterar o pacote, incremente a versão em **dois** arquivos que precisam coincidir: `packages/lab-runtime/pyproject.toml` e `packages/lab-runtime/src/dgk_lab_runtime/__init__.py` (o contrato `scripts/lab_runtime_version_contract.test.mjs` falha se divergirem).
    *   A publicação é acionada pelo push de uma tag `dgk-lab-runtime@X.Y.Z`:
        ```bash
        VERSION=$(node -p "require('node:fs').readFileSync('packages/lab-runtime/pyproject.toml','utf8').match(/^version = \"(.*)\"/m)[1]")
        git tag "dgk-lab-runtime@$VERSION"
        git push origin "dgk-lab-runtime@$VERSION"
        ```
    *   O push da tag dispara o workflow **"Publish dgk-lab-runtime"** (`publish-lab-runtime.yml`), que builda com `hatch` e publica no PyPI via trusted publisher.

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

2.  **Execute o `changeset version` para criar o commit de release:**
    Este comando irá ler os changesets pendentes, determinar a versão, gerar o `CHANGELOG.md`. Depois commite manualmente as mudanças.
    ```bash
    pnpm changeset version
    git add -A && git commit -m "chore(release): v$(node -p "require('./package.json').version")"
    ```

3.  **Empurre as mudanças e a tag para o repositório:**
    ```bash
    VERSION=$(node -p "require('./package.json').version")

    # Empurra o commit da release
    git push origin main

    # Cria e empurra a nova tag
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
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
*   **Teste Localmente:** Antes de gerar uma release, rode `pnpm run validate` e confira se o changelog simulado mostra o diff completo esperado.

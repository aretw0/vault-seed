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

## 4. Dicas e Boas Práticas

*   **Commits Atômicos:** Faça commits pequenos e focados em uma única mudança.
*   **Mensagens Claras:** Escreva mensagens de commit descritivas e que sigam a convenção.
*   **Teste Localmente:** Antes de gerar uma release, certifique-se de que suas mudanças estão funcionando como esperado.
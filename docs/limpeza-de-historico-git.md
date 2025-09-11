# Limpeza de Histórico Git: Removendo Releases Indesejadas

Este documento detalha o procedimento para limpar o histórico do Git quando uma release indesejada (por exemplo, uma release com changelog vazio que falhou no pipeline) é criada e suas tags e commits já foram enviados para o repositório remoto.

**Atenção:** A reescrita de histórico Git, especialmente em repositórios compartilhados, deve ser feita com extrema cautela e, idealmente, com comunicação prévia com a equipe. A melhor abordagem é sempre **prevenir** a criação de releases indesejadas, utilizando os "guardas" implementados no workflow de CI/CD.

## Cenário: Uma Release Indesejada Foi Criada e Enviada

Imagine que uma release (ex: `v0.1.5`) foi gerada pelo `standard-version` e suas tags e commits já foram enviados para o GitHub, mas o pipeline de CI/CD falhou porque o changelog estava vazio ou por outro motivo que torna essa release inválida.

## Procedimento de Limpeza

Siga os passos abaixo para remover a release indesejada do seu histórico Git.

### Passo 1: Remover a Tag Localmente

Comece removendo a tag do seu repositório local. Substitua `v0.1.5` pela tag da release que você deseja remover.

```bash
git tag -d v0.1.5
```

### Passo 2: Remover a Tag do Repositório Remoto

Se a tag já foi enviada para o GitHub (ou outro repositório remoto), você precisa removê-la de lá também. **Isso reescreve o histórico remoto para essa tag.**

```bash
git push origin :v0.1.5
```

*   **Explicação:** O comando `git push origin :<tagname>` significa "empurre nada para a tag `<tagname>` no `origin`", o que efetivamente a deleta do remoto.
*   **Impacto:** Se outros colaboradores já puxaram essa tag, eles precisarão deletá-la localmente (`git tag -d <tag>`) e depois puxar as atualizações do remoto (`git fetch --prune origin` ou `git pull`).

### Passo 3: Desfazer o Commit da Release

O `standard-version` cria um commit que atualiza o arquivo `VERSION`, o `CHANGELOG.md` e adiciona a tag. Como esse commit já foi enviado para o remoto, a forma mais segura de "desfazê-lo" é usando `git revert`. Isso cria um *novo commit* que desfaz as alterações do commit indesejado, preservando o histórico.

1.  **Identifique o Hash do Commit da Release:**
    Use `git log --oneline` para encontrar o commit que foi gerado pelo `standard-version` para a release indesejada (geralmente a mensagem de commit será algo como `chore(release): vX.Y.Z`).

    ```bash
    git log --oneline
    ```

2.  **Reverta o Commit:**
    Substitua `<hash_do_commit_da_release>` pelo hash que você identificou.

    ```bash
    git revert <hash_do_commit_da_release>
    ```

    Isso abrirá seu editor de texto padrão para que você possa editar a mensagem do commit de reversão. Salve e feche o editor.

### Passo 4: Enviar as Alterações para o Repositório Remoto

Após reverter o commit, envie o novo commit de reversão para o remoto.

```bash
git push origin main
```

## Após a Limpeza

Com a tag e o commit da release indesejada removidos (ou revertidos), você pode prosseguir com o processo de desenvolvimento normal. Certifique-se de que seus próximos commits sejam "changelog-worthy" (`feat`, `fix`, `refactor`, `BREAKING CHANGE`) antes de tentar gerar uma nova release.

Lembre-se que o "guarda" no workflow de CI/CD agora ajudará a prevenir que releases vazias sejam criadas novamente.
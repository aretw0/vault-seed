# Exemplo Prático: Limpando um Segredo do Histórico do Git

Este documento é um guia de ponta a ponta baseado em uma execução real de limpeza de histórico no nosso próprio repositório. Ele serve como um caso de uso prático do guia [Removendo Segredos do Histórico do Git com `git filter-repo`](./removendo-segredos-com-git-filter-repo.md).

## Contexto Inicial

- **Problema:** O arquivo `.obsidian/plugins/copilot/data.json`, contendo chaves de API, foi commitado na branch `main` em algum momento no passado.
- **Estado Atual:** Estamos trabalhando em uma branch `dev`, que foi criada a partir da `main` e, portanto, também carrega o histórico "contaminado".
- **Objetivo:** Remover completamente o arquivo `data.json` do histórico de **todas** as branches do repositório.

## Fluxo de Execução Detalhado

A seguir, os passos exatos que executamos.

### Passo 0: Preparação e Segurança

Antes de qualquer operação destrutiva, a preparação é crucial.

1.  **Verifique o status e sincronize sua branch de trabalho.**

    ```bash
    # Garante que não há trabalho não salvo e que a branch remota está atualizada
    git status
    git push origin dev
    ```

2.  **Crie um backup completo (espelho).** Esta é sua rede de segurança.

    ```bash
    # Navegue para a pasta pai do seu repositório
    cd ..
    # Crie o clone espelho
    git clone --mirror lais-vault lais-vault.bak
    # Volte para o diretório de trabalho
    cd lais-vault
    ```

### Passo 1: Execução da Limpeza

Com o backup em mãos, executamos o `git-filter-repo`. Ele opera em todo o repositório, então não é necessário mudar de branch.

```bash
pipx run git-filter-repo --path .obsidian/plugins/copilot/data.json --invert-paths --force
```

> ### 💡 Solução de Problemas Durante a Execução
> 
> Durante esta etapa, encontramos alguns erros esperados que servem como aprendizado.
> 
> -   **Erro 1: Prompt Interativo (`EOFError`)**
>     -   **Sintoma:** O script parou com um `EOFError: EOF when reading a line`.
>     -   **Causa:** `git-filter-repo` detectou uma execução anterior e pediu uma confirmação interativa (Y/N), que falha em ambientes não interativos.
>     -   **Solução:** Remover o diretório de estado do `filter-repo` para que ele acredite que é uma nova execução. O comando `rmdir /s /q .git\filter-repo` (Windows) ou `rm -rf .git/filter-repo` (Linux/macOS) resolve isso.
> 
> -   **Erro 2: Repositório "Não Limpo"**
>     -   **Sintoma:** O script abortou com a mensagem `Aborting: Refusing to destructively overwrite repo history...`.
>     -   **Causa:** Por segurança, a ferramenta se recusa a rodar em um repositório que não seja um clone "fresco".
>     -   **Solução:** Adicionar a flag `--force` ao comando. Isso confirma que estamos cientes dos riscos e desejamos prosseguir com a reescrita do histórico no repositório atual.

### Passo 2: Verificação Pós-Limpeza

Após a execução, confirmamos que o arquivo foi removido do histórico de todas as branches relevantes.

```bash
# Ambos os comandos devem retornar uma saída vazia
git log main -- .obsidian/plugins/copilot/data.json
git log dev -- .obsidian/plugins/copilot/data.json
```

### Passo 3: Sincronização Forçada com o Remoto

O histórico local foi reescrito. Agora, precisamos espelhar essa mudança no repositório remoto (GitHub).

> ### ⚠️ Ponto de Atenção: O Remote 'origin' foi Removido
> 
> -   **O quê?** Ao rodar, o `git-filter-repo` remove a configuração do seu `remote` (apelidado de `origin`).
> -   **Por quê?** É uma medida de segurança inteligente para impedir que você faça um `push` acidental para o lugar errado antes de estar pronto.
> -   **Solução:** Adicionar o remote de volta manualmente antes de tentar o push.

1.  **Adicione o remote novamente.**

    ```bash
    git remote add origin https://github.com/laismaria95/vault.git
    ```

2.  **Force o push de todas as branches e tags.**

    ```bash
    # O --force é necessário porque as histórias são divergentes
    git push origin --force --all
    git push origin --force --tags
    ```

### Passo 4: Finalização do Ambiente Local

O passo final é restaurar o arquivo `data.json` em sua versão "limpa", usando o sistema `smudge/clean` que já configuramos.

```bash
# O reset aciona o script smudge para recriar o arquivo a partir do .env
git reset --hard HEAD
```

Com isso, o processo está completo. O segredo foi removido do histórico local e remoto, e o ambiente de trabalho está consistente.

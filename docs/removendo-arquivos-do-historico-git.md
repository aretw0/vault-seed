# Removendo Arquivos do Histórico do Git com o Script de Automação

Este documento descreve o processo para remover completamente arquivos ou pastas que foram acidentalmente commitados no histórico de um repositório Git, utilizando o script de automação fornecido pelo projeto.

## O Problema: Dados Indesejados no Histórico

Quando um arquivo ou pasta é commitado, não basta apenas apagá-lo e fazer um novo commit. O conteúdo ainda existirá no histórico do Git, acessível a qualquer pessoa que tenha um clone do repositório. Isso pode ser um problema por várias razões, como a presença de arquivos grandes, dados temporários ou informações que simplesmente não deveriam estar no controle de versão.

## A Ferramenta: `scripts/remove_file_from_git_history.sh`

Para resolver isso de forma segura e automatizada, o projeto fornece o script `remove_file_from_git_history.sh`. Ele utiliza a ferramenta `git-filter-repo` (a abordagem moderna e recomendada pelo Git para reescrever o histórico) e encapsula todo o processo, incluindo:

1.  **Criação de um backup espelho** antes de qualquer modificação.
2.  **Execução do `git-filter-repo`** para remover o caminho especificado de todo o histórico.
3.  **Verificação** para garantir que o arquivo foi removido com sucesso.
4.  **Sincronização forçada** com o repositório remoto (`origin`), atualizando todas as branches e tags.
5.  **Limpeza opcional** do backup.

**Analogia:** Pense no script como um "revisor de história" automatizado. Se você publicou uma série de documentos, mas acidentalmente incluiu um rascunho pessoal em um deles, o revisor pode voltar, apagar esse rascunho de todas as versões publicadas e republicar a série corrigida, garantindo que o erro nunca tenha existido para futuros leitores. É uma operação poderosa e, por isso, o script toma várias precauções.

## Pré-requisitos

O script `setup.sh` do projeto já cuida da instalação do `git-filter-repo` e de outras dependências. Certifique-se de ter executado o setup antes de usar o script de remoção.

## Passo a Passo: Limpando o Repositório com o Script

O processo é simplificado para a execução de um único comando.

### 1. Execute o Script de Remoção

Abra o terminal na raiz do seu repositório e execute o script, passando o caminho do arquivo ou pasta que você deseja remover como argumento.

**IMPORTANTE:** O caminho deve ser informado entre aspas, especialmente se contiver espaços.

```bash
# Exemplo para remover um arquivo específico
bash scripts/remove_file_from_git_history.sh "caminho/para/meu-arquivo-indesejado.ext"

# Exemplo para remover uma pasta inteira
bash scripts/remove_file_from_git_history.sh "caminho/para/minha-pasta-indesejada/"
```

O script é interativo e irá guiá-lo pelo processo, pedindo confirmações em etapas críticas, como a exclusão do diretório de backup.

### 2. Comunique a Equipe

**AVISO:** A reescrita do histórico é uma operação destrutiva para o histórico compartilhado. Se outras pessoas colaboram no mesmo repositório, é crucial que você as avise sobre a alteração.

Após a execução do script, outros colaboradores precisarão atualizar seus clones locais para se alinharem ao novo histórico. A maneira mais segura e simples para eles fazerem isso é **clonar o repositório novamente** em um novo diretório. Tentar fazer `pull` ou `rebase` pode levar a conflitos complexos.

## Prevenção: Evitando que Aconteça Novamente

A melhor solução é a prevenção:

-   **`.gitignore`**: Sempre verifique e atualize seu arquivo `.gitignore` para excluir arquivos e pastas que não devem ser versionados *antes* de executar `git add`.
-   **Revisão antes do Commit**: Use `git status` e `git diff --staged` para revisar os arquivos que você está prestes a commitar.

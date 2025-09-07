# Removendo Segredos do Histórico do Git com `git filter-repo`

Este documento descreve o processo para remover completamente arquivos ou dados sensíveis (segredos) que foram acidentalmente commitados no histórico de um repositório Git.

## O Problema: Segredos no Histórico

Quando um segredo, como uma chave de API, é commitado, não basta apenas apagá-lo e fazer um novo commit. O segredo ainda existirá no histórico do Git, acessível a qualquer pessoa que tenha um clone do repositório. Isso representa um risco de segurança significativo.

Um exemplo claro é o arquivo de configuração de alguns plugins, como o `data.json` do Copilot, que pode armazenar chaves de API em texto plano:

```json
{
  "googleApiKey": "AIza...",
  "openRouterAiApiKey": "sk-or-v1...",
  ...
}
```

Mesmo que este arquivo seja adicionado ao `.gitignore` depois, o histórico que contém o segredo permanece.

## A Ferramenta: `git filter-repo`

`git filter-repo` é a ferramenta recomendada pelo Git para reescrever o histórico de um repositório. Ela é mais rápida e segura que ferramentas mais antigas como `git filter-branch` ou BFG.

**Analogia:** Pense no `git filter-repo` como um revisor de livros mágico. Se um autor publicou uma série de 10 livros, mas no terceiro livro escreveu acidentalmente a senha do seu cofre, não adianta lançar um 11º livro dizendo "ignore a senha". O revisor mágico pode voltar no tempo, apagar a senha de todas as cópias já impressas do terceiro livro e de todos os seguintes, criando uma nova versão da história onde a senha nunca existiu. É uma operação poderosa e, por isso, exige cuidado.

## Pré-requisitos: `pipx`

Para garantir que possamos rodar `git-filter-repo` de forma isolada e sem poluir nosso ambiente global, usaremos o `pipx`. Ele é para o Python o que o `npx` é para o Node.js: uma ferramenta para executar pacotes em ambientes temporários.

Você só precisa instalá-lo uma vez na sua máquina.

```bash
# Instalação do pipx
pip install --user pipx

# Adiciona o pipx ao seu PATH (necessário apenas na primeira vez)
pipx ensurepath
```

Após a instalação, talvez seja necessário reiniciar o terminal.

## Passo a Passo: Limpando o Repositório

Vamos usar o exemplo do arquivo `.obsidian/plugins/copilot/data.json` para ilustrar o processo.

### 1. Faça um Backup (MUITO IMPORTANTE)

Reescrever o histórico é uma operação destrutiva e irreversível no repositório remoto após o `push --force`. Antes de prosseguir, é crucial ter uma cópia de segurança.

Existem várias estratégias para isso, desde criar um clone local completo (espelho) até usar branches remotas. A escolha depende do seu nível de conforto e do contexto do projeto.

**➡️ Para uma análise detalhada das opções, consulte nosso guia: [Estratégias de Backup para Operações Destrutivas no Git](./estrategias-de-backup-git.md).**

Para este guia, vamos assumir que você fez um backup usando o método com o qual se sente mais seguro.

### 2. Execute o `git filter-repo`

O comando a seguir irá remover o arquivo `data.json` de **todo** o histórico do Git.

```bash
# Volte para o diretório do seu projeto
cd lais-vault

# Execute o comando para remover o arquivo do histórico usando pipx
pipx run git-filter-repo --path .obsidian/plugins/copilot/data.json --invert-paths --force
```

- `--path .obsidian/plugins/copilot/data.json`: Especifica o arquivo que queremos remover.
- `--invert-paths`: Inverte a seleção, significando que vamos manter tudo *exceto* o caminho especificado.
- `--force`: Necessário para rodar em um repositório que já foi processado.

### 3. Verifique a Remoção

Após a execução, verifique se o arquivo não existe mais no histórico.

```bash
# O arquivo não deve estar mais no seu diretório de trabalho
ls -la .obsidian/plugins/copilot/data.json

# Este comando não deve retornar nenhum commit
git log -- .obsidian/plugins/copilot/data.json
```

### 4. Restaure o Arquivo Limpo (se necessário)

Nossa configuração de `smudge` e `clean` foi projetada para proteger os segredos. Após a limpeza, o arquivo `data.json` estará ausente. Para restaurá-lo em sua versão "limpa" (sem os segredos), você pode forçar o Git a checar os arquivos novamente.

```bash
# Isso irá disparar o script "smudge" para recriar o arquivo a partir do .env
git reset --hard HEAD
```

### 5. Force o Push para o Repositório Remoto

**Nota sobre Autenticação (WSL/Windows):**
Para evitar prompts de usuário e senha durante o `git push --force`, especialmente se você estiver usando o WSL no Windows, certifique-se de que o Git no seu ambiente WSL esteja configurado para usar o Git Credential Manager (GCM) do Windows. Para instruções detalhadas, consulte a seção "Configuração do Git Credential Manager (GCM) no WSL" em [Compatibilidade de Ambiente e Setup](./compatibilidade-de-ambiente-e-setup.md).

Como o histórico local foi reescrito, ele divergiu do histórico no GitHub. Você precisará forçar o push.

**AVISO:** Forçar o push é perigoso se outras pessoas colaboram no mesmo repositório. Certifique-se de que todos os colaboradores saibam o que você está fazendo. Eles precisarão fazer um `fetch` e `reset` em seus clones locais para alinhar com o novo histórico.

```bash
# Force o push para todas as branches e tags
git push origin --force --all
git push origin --force --tags
```

## Prevenção: Evitando que Aconteça Novamente

A melhor solução é a prevenção.
1.  **`.gitignore`**: Certifique-se de que padrões de arquivos que podem conter segredos (como `*.json` em pastas de plugins) estejam no seu `.gitignore` *antes* de adicioná-los.
2.  **Scripts `clean` e `smudge`**: Utilize o sistema de `clean`/`smudge` que implementamos. Ele intercepta arquivos sensíveis antes do commit, extrai os segredos para um arquivo `.env` (que está no `.gitignore`) e deixa uma versão limpa e segura para ser commitada.

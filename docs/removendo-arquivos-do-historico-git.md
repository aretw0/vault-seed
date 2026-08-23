# Removendo Arquivos do Histórico do Git

Este documento descreve como remover arquivos ou pastas que foram commitados e
não deveriam estar no histórico.

## O problema

Quando um arquivo é commitado, apagá-lo num commit novo não basta: o conteúdo
continua no histórico, acessível a qualquer pessoa com um clone. Isso vale para
arquivos grandes, estado temporário e informações que não deveriam ser
versionadas.

## Por que não existe um comando único

Uma versão anterior deste documento descrevia um script que fazia tudo de uma
vez, incluindo `git push --force --all` e `--force --tags` na mesma execução da
reescrita, com uma opção para apagar o backup sem perguntar.

Esse desenho foi retirado. Reescrever histórico e publicá-lo são decisões
diferentes, tomadas em momentos diferentes:

- a reescrita é reversível enquanto for local, porque existe um backup espelho;
- o push **não é reversível**. Ele invalida todos os clones, e qualquer commit
  que outra pessoa tenha feito e não publicado passa a existir só na máquina
  dela.

Um script que faz as duas coisas junto remove a única janela em que dá para
conferir o resultado. Por isso o fluxo tem três peças, e a última é sua.

## As três peças

### 1. Manifesto local

Liste um caminho por linha em `.local/history-cleanup.paths`. O diretório
`.local/` é ignorado pelo Git de propósito, e o script de aplicação **recusa**
um manifesto rastreado — um manifesto versionado é um índice público do que se
quis esconder.

```
50 - Arquivo/Documentos/
99 - Meta e Anexos/Anexos/arquivo-indesejado.pdf
```

### 2. Plano

```bash
bash scripts/history_cleanup_plan.sh .local/history-cleanup.paths
```

Relata, para cada caminho, se ele está no índice atual e em quantos commits
aparece. Não altera arquivos, refs ou remotes.

### 3. Aplicação local

Com a árvore de trabalho limpa e a decisão tomada:

```bash
bash scripts/history_cleanup_apply_local.sh \
  .local/history-cleanup.paths \
  REESCREVER_APENAS_LOCALMENTE \
  [.local/history-cleanup.mailmap]
```

O script cria um backup espelho, reescreve **apenas o clone atual**, consolida
identidades se um mailmap for informado, verifica que nenhum caminho e nenhuma
identidade antiga sobreviveu, restaura o remote e para. **Ele não faz push.**

O mailmap é opcional e usa o formato do Git:

```
Nome Canônico <canonico@exemplo> Nome Antigo <antigo@exemplo>
```

## Antes de publicar

> [!warning]
> `git filter-repo` faz checkout do resultado. Um arquivo **rastreado** que
> entra no manifesto **some da árvore de trabalho**. Copie para fora do
> repositório o que precisar manter antes de aplicar.

1. abra as notas e anexos restantes e confira o conteúdo;
2. rode a suíte de testes do vault;
3. confira `git shortlog -sne --all` se usou mailmap;
4. procure cada caminho em todos os refs;
5. restaure o backup espelho num diretório temporário e confirme que ele abre;
6. confirme que nenhum dispositivo tem commit local não publicado.

## Publicar

```bash
git fetch origin
git push --force-with-lease=main:<sha-do-remoto> origin main
```

Nunca `--force` cego. E rode o `fetch` **imediatamente antes**: o
`--force-with-lease` compara com a referência remota que o seu clone conhece, e
uma referência velha protege contra menos do que parece.

Depois do push, todo clone existente fica órfão e não consegue `pull`, porque
não há ancestral comum. Cada dispositivo precisa reclonar. O backup espelho e os
clones antigos continuam contendo o que foi removido, e precisam ser tratados.

## Prevenção

- **`.gitignore` antes do `git add`**, e por lugar em vez de por extensão: uma
  pasta designada declara intenção, enquanto `*.pdf` barra anexo legítimo em
  qualquer lugar e continua cego para a mesma informação em `.jpg`;
- **revisão antes do commit**, com `git status` e `git diff --staged`.

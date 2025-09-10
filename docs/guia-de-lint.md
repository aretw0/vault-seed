# Guia de Lint de Markdown

Este documento explica como o lint de Markdown está configurado neste projeto, como ele é aplicado em diferentes contextos e como você pode gerenciar suas regras.

## O que é Lint de Markdown?

Linting é o processo de analisar o código (neste caso, arquivos Markdown) para sinalizar erros de programação, bugs, erros estilísticos e construções suspeitas. Ele ajuda a manter a consistência, legibilidade e qualidade dos seus documentos.

## Configuração de Lint no Projeto

Utilizamos a ferramenta `markdownlint` para aplicar as regras de lint. A configuração é feita através de arquivos `.markdownlint.json`.

### Regras Globais (Vault Principal)

O arquivo `.markdownlint.json` na raiz do projeto define as regras padrão para a maioria dos arquivos Markdown no seu vault. Ele desativa algumas regras que podem ser muito restritivas para notas pessoais.

### Regras Específicas por Diretório

Para oferecer maior flexibilidade, algumas pastas possuem configurações de lint personalizadas:

*   **`docs/` (Documentação):**
    *   Local: `docs/.markdownlint.json`
    *   Este diretório contém a documentação do projeto. As regras de lint aqui são mais flexíveis do que as regras globais para permitir maior liberdade na escrita de documentação, que pode ter estruturas e estilos variados. Regras relacionadas a cabeçalhos e listas, por exemplo, são mais permissivas.

*   **`90 - Templates/` (Templates):**
    *   Local: `90 - Templates/.markdownlint.json`
    *   Esta pasta contém os templates que você usa para criar novas notas. As regras de lint aqui são extremamente permissivas, pois os templates podem conter placeholders, estruturas incompletas ou exemplos que não seguiriam as regras de lint de um documento final.

*   **`00 - Inbox/` (Caixa de Entrada):
    *   Esta pasta é destinada a rascunhos rápidos e notas temporárias. Por isso, **nenhuma regra de lint é aplicada** a arquivos dentro de `00 - Inbox/`. Isso permite que você capture ideias rapidamente sem se preocupar com a formatação.

## Como o Lint é Executado

O lint é executado em dois principais contextos:

1.  **Localmente (via `npm run lint`):**
    *   Você pode executar o lint manualmente em seu ambiente de desenvolvimento. O comando `npm run lint` (definido no `package.json`) irá executar o `markdownlint` em todos os arquivos Markdown, respeitando as configurações específicas de cada diretório.

2.  **No Pipeline de Integração Contínua (CI):**
    *   O workflow `.github/workflows/ci.yml` no GitHub Actions executa o lint automaticamente em cada `push` e `pull request` para a branch `main`. Isso garante que todas as alterações que chegam à branch principal estejam em conformidade com as regras de lint definidas.
    *   O pipeline executa o `markdownlint` separadamente para o vault principal (excluindo `00 - Inbox/`), para a pasta `docs/` e para a pasta `90 - Templates/`, cada um com sua respectiva configuração.

## Desativando Regras de Lint

Você pode desativar regras de lint de várias maneiras:

### Desativar uma Regra para um Arquivo Específico

Para desativar uma ou mais regras para um arquivo Markdown específico, adicione um comentário HTML no início do arquivo:

```markdown
<!-- markdownlint-disable MD001 MD003 -->

# Meu Título
```

Substitua `MD001 MD003` pelos códigos das regras que você deseja desativar.

### Desativar uma Regra para uma Linha Específica

Para desativar uma regra para uma linha específica, adicione um comentário HTML na linha anterior:

```markdown
<!-- markdownlint-disable-next-line MD001 -->
# Meu Título
```

### Desativar Todas as Regras para um Arquivo Específico

Para desativar todas as regras para um arquivo específico:

```markdown
<!-- markdownlint-disable-all -->

# Meu Título
```

### Configurando Pastas para Serem Ignoradas ou com Comportamento Diferente

Conforme explicado na seção "Regras Específicas por Diretório", a maneira mais eficaz de configurar pastas para terem comportamentos de lint diferentes é através de arquivos `.markdownlint.json` aninhados.

*   **Para ignorar completamente uma pasta:** A pasta `00 - Inbox/` é ignorada diretamente no script de CI e no comando `npm run lint`. Você pode adicionar outras pastas a essa lista de ignorados se necessário.
*   **Para aplicar regras diferentes:** Crie um arquivo `.markdownlint.json` dentro da pasta com as regras desejadas. O `markdownlint` automaticamente usará a configuração mais próxima do arquivo que está sendo lintado.

## Solução de Problemas

Se o lint estiver falhando no seu ambiente local ou no CI, verifique os seguintes pontos:

*   **Mensagens de Erro:** O `markdownlint` fornece mensagens de erro claras indicando qual regra foi violada e em qual linha.
*   **Configuração:** Verifique se o arquivo `.markdownlint.json` relevante está configurado corretamente.
*   **Caminhos:** Certifique-se de que os caminhos nos comandos de lint (no `package.json` ou `ci.yml`) estão corretos e apontam para os arquivos e pastas desejados.

Este guia deve ajudá-lo a entender e gerenciar o lint de Markdown em seu projeto.

# Estratégia de Versionamento e Releases

Este documento descreve a estratégia de versionamento e o processo de release automatizado utilizado neste projeto (template). Adotamos o **Versionamento Semântico (Semantic Versioning)** em conjunto com as **Conventional Commits** para garantir consistência, clareza e automação em nossos lançamentos.

## Versionamento Semântico (SemVer)

O Versionamento Semântico (SemVer) é um sistema de versionamento de software que utiliza três números: `MAIOR.MENOR.PATCH` (ex: `1.2.3`).

-   **MAIOR (Major):** Incrementado quando há mudanças incompatíveis na API (breaking changes).
-   **MENOR (Minor):** Incrementado quando novas funcionalidades são adicionadas de forma compatível com versões anteriores.
-   **PATCH:** Incrementado quando são feitas correções de bugs compatíveis com versões anteriores.

## Conventional Commits

Utilizamos as Conventional Commits para padronizar as mensagens de commit. Essa padronização permite que ferramentas automatizadas (como o `standard-version`) interpretem o tipo de mudança e determinem o bump de versão apropriado.

As mensagens de commit devem seguir o formato: `<tipo>(escopo opcional): <descrição>`

### Tipos de Commit e Impacto no Versionamento

Os tipos de commit mais comuns e seu impacto no versionamento são:

-   **`fix`:** Um commit do tipo `fix` (correção de bug) resulta em um **bump de versão PATCH**.
    *   Exemplo: `fix(dataview): corrige erro na query de notas órfãs`

-   **`feat`:** Um commit do tipo `feat` (nova funcionalidade) resulta em um **bump de versão MENOR**.
    *   Exemplo: `feat(template): adiciona novo template para notas de projeto`

-   **`BREAKING CHANGE`:** Qualquer tipo de commit que inclua `BREAKING CHANGE:` no rodapé da mensagem ou um `!` após o tipo/escopo (ex: `refactor(estrutura)!: altera hierarquia de pastas PARA`) resulta em um **bump de versão MAIOR**.
    *   Exemplo:
        ```
        refactor(estrutura): altera hierarquia de pastas PARA

        BREAKING CHANGE: A estrutura de pastas principal foi alterada, exigindo migração manual de notas existentes.
        ```

### Outros Tipos de Commit (Sem Impacto Direto no Versionamento)

Outros tipos de commit são importantes para o histórico do projeto, mas não resultam em um bump de versão automático por padrão:

-   **`build`:** Mudanças que afetam o sistema de build ou dependências externas (escopos).
-   **`ci`:** Mudanças nos arquivos e scripts de CI (Continuous Integration).
    *   Exemplo: `ci: adiciona verificação de links quebrados no workflow`
-   **`docs`:** Mudanças apenas na documentação.
    *   Exemplo: `docs: atualiza guia de uso do Templater`
-   **`perf`:** Mudanças de código que melhoram a performance.
-   **`refactor`:** Uma mudança de código que não corrige um bug nem adiciona uma funcionalidade.
    *   Exemplo: `refactor(templates): otimiza lógica de criação de notas`
-   **`revert`:** Reverte um commit anterior.
-   **`style`:** Mudanças que não afetam o significado do código (espaços em branco, formatação, ponto e vírgula ausente, etc.).
-   **`test`:** Adição de testes ausentes ou correção de testes existentes.
-   **`chore`:** Outras mudanças que não modificam o código fonte ou arquivos de teste.
    *   Exemplo: `chore: atualiza dependências do Node.js`

## Automação com `standard-version`

A ferramenta `standard-version` automatiza o processo de release com base nas Conventional Commits:

1.  **Analisa Commits:** Percorre o histórico de commits desde a última tag.
2.  **Determina Próxima Versão:** Com base nos tipos de commit (`fix`, `feat`, `BREAKING CHANGE`), determina o próximo número de versão (patch, minor ou major).
3.  **Atualiza `VERSION`:** Altera o número da versão no arquivo `VERSION`.
4.  **Gera `CHANGELOG.md`:** Adiciona as mudanças relevantes ao `CHANGELOG.md`.
5.  **Cria Commit de Release:** Cria um novo commit contendo as atualizações do `VERSION` e `CHANGELOG.md`.
6.  **Cria Tag Git:** Adiciona uma tag Git (ex: `v1.0.0`) ao commit de release.

## Considerações Importantes

-   **Controle Manual:** Embora o processo seja automatizado, o desenvolvedor ainda tem controle sobre quando executar o `npm run release`. Para forçar um tipo específico de release, ignorando a análise dos commits, você pode usar os scripts auxiliares:
    *   `npm run release:minor`: Força uma release `minor`.
    *   `npm run release:major`: Força uma release `major`.
-   **Releases Iniciais (0.y.z):** Durante a fase de desenvolvimento inicial (versões `0.y.z`), mesmo mudanças menores podem ser consideradas "breaking changes" na prática, pois a API ainda não é estável. A decisão de fazer um bump `minor` ou `major` nessa fase pode ser mais flexível.

---

**Próximos Passos:**

Após a criação desta documentação, o próximo passo será implementar o workflow de GitHub Actions para a criação automática de releases no GitHub, acionado pela tag gerada pelo `standard-version`.
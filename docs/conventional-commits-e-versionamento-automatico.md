# Conventional Commits e Versionamento Automático

Para manter nosso histórico de alterações claro, consistente e útil, adotamos a especificação [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Essa prática não apenas melhora a legibilidade dos commits, mas também nos permite automatizar tarefas cruciais como a geração de changelogs e o versionamento semântico.

O arquivo `.gitmessage` na raiz do projeto é a base desse sistema de padronização de commits. A automação de releases é gerenciada pelo `@changesets/cli`.

## 1. `.gitmessage`: O Guia do Commit Perfeito

Pense no arquivo `.gitmessage` como um "gabarito" ou um "template" para cada commit que você faz.

**Como ele funciona?**

Quando você executa o comando `git commit` (sem a flag `-m`), seu editor de texto abre com o conteúdo do arquivo `.gitmessage` já preenchido. Ele serve como um guia visual imediato, lembrando o desenvolvedor do padrão que o projeto adotou.

**Vantagens:**

*   **Lembrete da Estrutura:** Em vez de memorizar os tipos (`feat`, `fix`, `docs`), o template já mostra tudo.
*   **Redução de Erros:** A chance de esquecer um tipo, usar o tempo verbal errado ou escrever um título muito longo diminui drasticamente.
*   **Consistência:** Incentiva fortemente que todos os contribuidores sigam o mesmo padrão.

Nosso template (`.gitmessage`) é configurado para guiar a escrita de um commit convencional:

```
# <tipo>(<escopo>): <descrição curta>
# |<---- Usar no máximo 50 caracteres ---->|

# --- TIPOS DE COMMIT ---
# feat     ✨ (novo recurso)
# fix      🐛 (correção de bug)
# docs     📚 (documentação)
# ...
```

Para que o Git use este template, nosso script de setup (`scripts/setup.sh`) executa o seguinte comando:

```bash
git config commit.template .gitmessage
```

## 2. `@changesets/cli`: O Motor da Automação

Se o `.gitmessage` é o guia, o `@changesets/cli` é o motor que usa essa consistência para gerar valor automaticamente. Esta ferramenta automatiza a criação de changelogs e o versionamento semântico com base em arquivos de changeset.

**Como ele funciona?**

Durante o desenvolvimento, cada conjunto de mudanças relevantes é descrito em um arquivo de changeset criado com `pnpm changeset`. Ao preparar uma release, o comando `pnpm changeset version` lê todos os changesets pendentes e determina a próxima versão, atualizando `package.json` e `CHANGELOG.md`.

**Vantagens:**

*   **Geração Automática de Changelog:** Ao rodar `pnpm changeset version`, a ferramenta gera uma nova seção no `CHANGELOG.md` com as descrições dos changesets.
*   **Versionamento Semântico (SemVer) Automático:** O tipo de bump é definido no momento da criação do changeset (`pnpm changeset`):
    *   `patch`: Correções de bugs (ex: `1.1.0` -> `1.1.1`).
    *   `minor`: Novas funcionalidades retrocompatíveis (ex: `1.1.0` -> `1.2.0`).
    *   `major`: Mudanças que quebram a compatibilidade (ex: `1.1.0` -> `2.0.0`).
*   **Release em duas fases:** Primeiro `pnpm changeset version` gera `CHANGELOG.md` e o commit `chore(release)`. Depois o workflow de publicação cria a tag Git e a GitHub Release.

## O Ciclo Virtuoso

1.  O **`.gitmessage`** facilita a criação de mensagens de commit padronizadas.
2.  Essas mensagens se tornam "dados estruturados" no histórico do Git.
3.  O **`@changesets/cli`** consolida as descrições de mudança em changesets que alimentam a geração automática de changelog e a determinação da próxima versão.

Juntos, eles transformam o ato de commitar em um passo que alimenta diretamente a documentação e o processo de release do projeto.

## 3. O Fluxo de Release: Gerando o Changelog na Prática

A teoria acima se materializa através dos comandos do `@changesets/cli`. Aqui está o passo a passo ideal:

### Passo 1: Pré-requisito - Um Rascunho Seguro e Limpo

Antes de publicar uma nova versão, você precisa garantir que todo o seu trabalho está salvo e seu ambiente está limpo. Use o comando:

```bash
git status
```

O resultado deve ser `nothing to commit, working tree clean`. Isso evita que mudanças não finalizadas entrem acidentalmente na nova versão.

### Passo 2: Verificação (Preview) - A Medida de Segurança

Para verificar quais changesets estão pendentes e qual seria o próximo bump de versão antes de commitar qualquer coisa, use:

```bash
pnpm changeset status
```

Você verá no terminal os changesets pendentes e o tipo de bump que será aplicado. Se tudo estiver como esperado, você pode prosseguir.

### Passo 3: Execução - Criando a Nova Versão

Agora, o comando real:

```bash
pnpm changeset version
```

Ele irá:
1.  **Ler** os arquivos de changeset pendentes em `.changeset/`.
2.  **Determinar** a próxima versão com base nos tipos de bump declarados.
3.  **Atualizar** o `package.json` com o novo número de versão.
4.  **Criar ou atualizar** o arquivo `CHANGELOG.md` com as descrições dos changesets.
5.  **Remover** os arquivos de changeset consumidos.

Depois, commite as mudanças manualmente:

```bash
git add -A && git commit -m "chore(release): v$(node -p "require('./package.json').version")"
```

A tag é criada depois pelo workflow `release.yml`, somente quando o Pull Request de release chega à `main`.

### Passo 4: Publicando as Mudanças

Até agora, o novo commit está apenas no seu computador local. Para publicar manualmente sem os workflows, envie o commit e crie a tag a partir da versão em `package.json`:

```bash
VERSION=$(node -p "require('./package.json').version")
git push origin main
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"
```

**Analogia:** Pense neste comando como "enviar a versão final de um documento revisado, junto com seu diário de alterações, para a nuvem, garantindo que a etiqueta da nova versão vá junto".

Este fluxo garante que nosso changelog e nossas versões sejam sempre um reflexo fiel e automatizado do trabalho realizado.

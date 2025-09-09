# Conventional Commits e Versionamento Automático

Para manter nosso histórico de alterações claro, consistente e útil, adotamos a especificação [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Essa prática não apenas melhora a legibilidade dos commits, mas também nos permite automatizar tarefas cruciais como a geração de changelogs e o versionamento semântico.

Dois arquivos na raiz do projeto são a base desse sistema: `.gitmessage` e `.versionrc`.

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

## 2. `.versionrc`: O Cérebro da Automação

Se o `.gitmessage` é o guia, o `.versionrc` é o motor que usa essa consistência para gerar valor automaticamente. Este arquivo é a configuração para a ferramenta `standard-version`, que automatiza a criação de changelogs e o versionamento.

**Como ele funciona?**

A ferramenta `standard-version` lê todo o histórico de commits desde a última tag (versão). Ela procura por commits que sigam o padrão Conventional Commits e usa as informações (o `tipo` e a `descrição`) para construir um `CHANGELOG.md`.

Nosso arquivo `.versionrc` diz à ferramenta *como* agrupar e apresentar esses commits:

```json
{
  "types": [
    { "type": "feat", "section": "✨ Novos Recursos" },
    { "type": "fix", "section": "🐛 Correções" },
    { "type": "docs", "section": "📚 Documentação" },
    // ... outros tipos
  ]
}
```

**Vantagens:**

*   **Geração Automática de Changelog:** Ao rodar `npx standard-version`, a ferramenta gera uma nova seção no `CHANGELOG.md` com títulos amigáveis.
*   **Versionamento Semântico (SemVer) Automático:** A ferramenta detecta o tipo de mudança para sugerir a próxima versão:
    *   `feat`: Aumenta a versão menor (ex: `1.1.0` -> `1.2.0`).
    *   `fix`: Aumenta a versão de patch (ex: `1.1.0` -> `1.1.1`).
    *   `BREAKING CHANGE:` ou `feat!`: Aumenta a versão maior (ex: `1.1.0` -> `2.0.0`).
*   **Criação de Tags:** Após a atualização, a ferramenta cria automaticamente uma nova tag Git (ex: `v1.2.0`).

## O Ciclo Virtuoso

1.  O **`.gitmessage`** facilita a criação de mensagens de commit padronizadas.
2.  Essas mensagens se tornam "dados estruturados" no histórico do Git.
3.  O **`.versionrc`** ensina ferramentas de automação a lerem esses dados para gerar changelogs, determinar a próxima versão e criar tags de release.

Juntos, eles transformam o ato de commitar em um passo que alimenta diretamente a documentação e o processo de release do projeto.

## 3. O Fluxo de Release: Gerando o Changelog na Prática

A teoria acima se materializa através de um único comando no `package.json`:

```json
"scripts": {
  "release": "standard-version"
}
```

Executar `npm run release` orquestra todo o processo de versionamento. Aqui está o passo a passo ideal:

### Passo 1: Pré-requisito - Um Rascunho Seguro e Limpo

Antes de publicar uma nova versão, você precisa garantir que todo o seu trabalho está salvo e seu ambiente está limpo. Use o comando:

```bash
git status
```

O resultado deve ser `nothing to commit, working tree clean`. Isso evita que mudanças não finalizadas entrem acidentalmente na nova versão.

### Passo 2: Simulação (Dry Run) - A Medida de Segurança

Para evitar surpresas, sempre faça uma simulação antes. Pense nisso como um "ensaio geral". O comando a seguir mostra tudo o que será feito, mas sem de fato alterar nenhum arquivo.

```bash
npm run release -- --dry-run
```

O ` -- ` é importante para passar o argumento `--dry-run` diretamente para o `standard-version`.

Você verá no terminal a nova versão que será criada e um preview do `CHANGELOG.md`. Se tudo estiver como esperado, você pode prosseguir.

### Passo 3: Execução - Criando a Nova Versão

Agora, o comando real:

```bash
npm run release
```

Ele irá:
1.  **Analisar** os commits desde a última versão.
2.  **Atualizar** o arquivo `VERSION` com o novo número de versão (ex: de `0.0.1` para `0.0.2`).
3.  **Criar ou atualizar** o arquivo `CHANGELOG.md` com as seções de "Novos Recursos", "Correções", etc.
4.  **Criar um commit** do tipo `chore(release)` contendo as mudanças nos arquivos `VERSION` e `CHANGELOG.md`.
5.  **Criar uma tag Git** (ex: `v0.0.2`) apontando para este novo commit.

### Passo 4: Publicando as Mudanças

Até agora, todas as mudanças (o novo commit e a tag) estão apenas no seu computador local. Para que outros colaboradores e o GitHub saibam da nova versão, você precisa publicá-la:

```bash
git push --follow-tags origin main
```

**Analogia:** Pense neste comando como "enviar a versão final de um documento revisado, junto com seu diário de alterações, para a nuvem, garantindo que a etiqueta da nova versão vá junto".

Este fluxo garante que nosso changelog e nossas versões sejam sempre um reflexo fiel e automatizado do trabalho realizado.
# vault-seed

[![License](https://img.shields.io/github/license/aretw0/vault-seed.svg?color=red)](LICENSE.md)
[![Release](https://img.shields.io/github/release/aretw0/vault-seed.svg?branch=main)](https://github.com/aretw0/vault-seed/releases)

Esta "semente" (seed) de cofre (vault) com foco no Obsidian e Visual Studio Code (Foam), visa equilibrar estrutura e flexibilidade, permitindo que seu cofre de conhecimento cresça organicamente.

> Template original: [https://github.com/aretw0/vault-seed](https://github.com/aretw0/vault-seed)

## Para Contribuidores

| Tarefa | Recurso |
|---|---|
| Setup local (fnm, uv, pnpm) | `docs/compatibilidade-de-ambiente-e-setup.md` |
| Devcontainer do template | `.devcontainer/` |
| Guia de contribuição | `CONTRIBUTING.md` |
| Arquitetura e decisões | `docs/INDEX.md` |

## Pré-requisitos

Para utilizar este template e criar seu próprio cofre de conhecimento, você precisará ter:

-   Git instalado no seu sistema ([https://git-scm.com/downloads](https://git-scm.com/downloads)).
-   Uma conta no GitHub ([https://github.com/](https://github.com/)).
-   Obsidian ([https://obsidian.md/](https://obsidian.md/)) ou Visual Studio Code ([https://code.visualstudio.com/](https://code.visualstudio.com/)) instalados.

# 🚀 Primeiros Passos (Criando seu Cofre)

Este repositório é um template projetado para simplificar a criação do seu próprio cofre de conhecimento. Siga os passos abaixo para começar:

### 1. Crie seu Repositório a partir do Template

Clique no botão "Use this template" no topo da página do GitHub ou use este link: <a id="copy" href="https://github.com/new?template_name=vault-seed&template_owner=aretw0"><img src="https://img.shields.io/badge/📠_Criar_seu_cofre-008000" height="25pt"/></a>. Isso criará um novo repositório na sua conta com uma cópia limpa de todos os arquivos, mas **sem o histórico de desenvolvimento deste template**.

### 2. Aguarde a Inicialização Automática (Importante!)

Após criar seu repositório, o GitHub Actions iniciará automaticamente um processo de inicialização. Este processo irá:

-   Limpar o arquivo `CHANGELOG.md`.
-   Resetar a versão inicial para `0.0.1`.
-   Personalizar o `README.md` e o `CONTRIBUTING.md` para o seu novo cofre.
-   Remover o próprio workflow de inicialização para garantir que ele rode apenas uma vez.

**É crucial que você aguarde a conclusão deste processo.** Você pode acompanhar o progresso na aba "Actions" do seu novo repositório no GitHub. O primeiro commit após a criação do repositório será o "commit de fundação" do seu cofre.

### 3. Clone seu Novo Repositório

Após a inicialização automática ser concluída, clone o repositório que **você acabou de criar** para a sua máquina local:

```bash
git clone https://github.com/SEU-USUARIO/NOME-DO-SEU-REPOSITORIO.git
```

### 4. Abra e Explore

Agora seu cofre está pronto! Abra a pasta no Obsidian ou Visual Studio Code.

➡️ Para começar sua jornada, abra a nota **`[[Guia do Jardineiro Digital]]`**.
Depois, siga **`[[Exploracao Guiada do Vault]]`** para uma primeira visita de
30 minutos sem precisar entender Git, plugins ou automações de uma vez.

Se este for seu primeiro vault versionado, abra também
**`[[Preparando seu Computador para o Vault]]`** para configurar Obsidian,
VS Code, Git, GitHub Desktop e sincronização sem conflitos entre dispositivos.

Quando a recepção automática do template terminar, abra
**`[[Depois da Recepcao do Template]]`** para conferir o que ficou com você,
o que não deve ser sincronizado manualmente e como operar o vault entre
desktop e celular.

## Assistentes de IA

O vault inclui um prompt de projeto em `AGENTS.md` para orientar assistentes de
IA sobre a estrutura PARA, o fluxo com Git e as convenções de escrita. Arquivos
de compatibilidade apontam para essa mesma fonte: `GEMINI.md` é um link
simbólico para `AGENTS.md`, e `CLAUDE.md` importa `AGENTS.md` com a sintaxe
suportada pelo Claude Code.

No Obsidian, plugins de IA da comunidade podem usar esse prompt de duas formas:
aponte o plugin para `AGENTS.md` quando ele aceitar arquivo de contexto, ou cole
o conteúdo de `AGENTS.md` no campo de system prompt/instruções quando ele aceitar
apenas texto.

## Qualidade do Onboarding

Este template valida automaticamente o material de entrada para evitar drift:

```bash
pnpm run validate
```

Esse comando roda lint Markdown, testes dos scripts e smokes de template. Ele
verifica se os arquivos essenciais de onboarding existem, se os wikilinks do
vault apontam para notas reais e se as automacoes continuam usando `pnpm`.

---
## Contribuições e Traduções

A língua principal deste projeto (template) é o Português (Brasil). Contribuições que adicionem traduções da documentação ou melhorias ao **template original** são muito bem-vindas! Por favor, veja o nosso [Guia de Contribuição](CONTRIBUTING.md) para mais detalhes.

*The main language of this project (template) is Portuguese (Brazil). Contributions that add documentation translations or improvements to the **original template** are very welcome! Please see our [Contribution Guide](CONTRIBUTING.md) for more details.*

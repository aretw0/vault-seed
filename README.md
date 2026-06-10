# vault-seed

[![License](https://img.shields.io/github/license/aretw0/vault-seed.svg?color=red)](LICENSE.md)
[![Release](https://img.shields.io/github/release/aretw0/vault-seed.svg?branch=main)](https://github.com/aretw0/vault-seed/releases)

Esta "semente" (seed) de cofre (vault) é uma base flexível para conhecimento local-first: arquivos puros, estrutura inicial, automações básicas, publicação Astro e um Lab Marimo opcional sem impor o uso final do vault.

> Template original: [https://github.com/aretw0/vault-seed](https://github.com/aretw0/vault-seed)

## Para Quem Quer Criar Um Vault

Use este repositório como template quando você quer começar um vault versionado sem montar toda a estrutura do zero. Ele pode virar site pessoal, blog simples, documentação coletiva ou cartão de visita. Os guias de orientação ficam em `99 - Meta e Anexos/` — seu conteúdo de conhecimento vai nas pastas PARA (`40 - Recursos/`, `20 - Projetos/`, `30 - Áreas/` e afins).

## Pré-requisitos

Para utilizar este template e criar seu próprio cofre de conhecimento, você precisará ter:

-   Git instalado no seu sistema ([https://git-scm.com/downloads](https://git-scm.com/downloads)).
-   Uma conta no GitHub ([https://github.com/](https://github.com/)).
-   Obsidian ([https://obsidian.md/](https://obsidian.md/)) ou Visual Studio Code ([https://code.visualstudio.com/](https://code.visualstudio.com/)) instalados.

## Primeiros Passos

Este repositório é um template projetado para simplificar a criação do seu próprio cofre de conhecimento. Siga os passos abaixo para começar:

### 1. Crie seu Repositório a partir do Template

Clique no botão "Use this template" no topo da página do GitHub ou use este link: <a id="copy" href="https://github.com/new?template_name=vault-seed&template_owner=aretw0"><img src="https://img.shields.io/badge/Criar_seu_cofre-008000" height="25pt"/></a>. Isso criará um novo repositório na sua conta com uma cópia limpa de todos os arquivos, mas **sem o histórico de desenvolvimento deste template**.

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

Agora seu cofre está pronto. Abra a pasta no Obsidian ou Visual Studio Code.

Para começar, abra a nota **[Guia do Jardineiro Digital](99%20-%20Meta%20e%20Anexos/Guia%20do%20Jardineiro%20Digital.md)**.
Depois, siga **[Exploração Guiada do Vault](99%20-%20Meta%20e%20Anexos/Exploracao%20Guiada%20do%20Vault.md)** para uma primeira visita de
30 minutos sem precisar entender Git, plugins ou automações de uma vez.

Se este for seu primeiro vault versionado, abra também
**[Preparando seu Computador para o Vault](99%20-%20Meta%20e%20Anexos/Preparando%20seu%20Computador%20para%20o%20Vault.md)** para configurar Obsidian,
VS Code, Git, GitHub Desktop e sincronização sem conflitos entre dispositivos.

Quando a recepção automática do template terminar, abra
**[Depois da Recepção do Template](99%20-%20Meta%20e%20Anexos/Depois%20da%20Recepcao%20do%20Template.md)** para conferir o que ficou com você,
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

Esse comando roda a régua canônica de qualidade: lint Markdown, auditoria de
arquitetura de informação, auditoria da sidebar, testes dos scripts, validação
do onboarding, revisão de acentos em português, contraste dos temas, Mermaid e
smokes de template. Ele verifica se o vault continua publicável, navegável e
coerente antes de ir para o CI ou para o deploy do site.

## Para Contribuidores Do Template

| Tarefa | Recurso |
|---|---|
| Setup local (fnm, uv, pnpm) | `docs/compatibilidade-de-ambiente-e-setup.md` |
| Devcontainer do template | `.devcontainer/` |
| Guia de contribuição | `CONTRIBUTING.md` |
| Arquitetura e decisões | `docs/INDEX.md` |
| Release e publish dry-run | `pnpm run release:package:smoke` |

Contribuidores trabalham no template original. Usuários que geraram um vault a partir dele não precisam seguir o fluxo interno de release do template para usar suas próprias notas.

---
## Contribuições e Traduções

A língua principal deste projeto (template) é o Português (Brasil). Contribuições que adicionem traduções da documentação ou melhorias ao **template original** são muito bem-vindas! Por favor, veja o nosso [Guia de Contribuição](CONTRIBUTING.md) para mais detalhes.

*The main language of this project (template) is Portuguese (Brazil). Contributions that add documentation translations or improvements to the **original template** are very welcome! Please see our [Contribution Guide](CONTRIBUTING.md) for more details.*

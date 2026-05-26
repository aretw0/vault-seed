# {{REPO_NAME}}

Esta é uma "semente" (seed) de cofre (vault): uma base flexível para conhecimento local-first com arquivos puros, estrutura inicial, publicação Astro e Lab Marimo opcional, sem impor o uso final do seu espaço.

> Template original: [https://github.com/aretw0/vault-seed](https://github.com/aretw0/vault-seed)

## Como Começar

| Quero... | Caminho |
|---|---|
| Usar só o Obsidian, sem terminal | Instale o Obsidian e abra esta pasta |
| VS Code + scripts locais | [Configurando Localmente](99%20-%20Meta%20e%20Anexos/Configurando%20Localmente.md) |
| Devcontainer (VS Code + Docker) | [Configurando com Devcontainer](99%20-%20Meta%20e%20Anexos/Configurando%20com%20Devcontainer.md) |
| Usar com agentes de IA | [Usando com Agentes de IA](99%20-%20Meta%20e%20Anexos/Usando%20com%20Agentes%20de%20IA.md) |

Os guias detalhados estão em `99 - Meta e Anexos/`. Para entender a camada visual do site publicado, veja [Identidade Visual e Blocos de Interface](99%20-%20Meta%20e%20Anexos/Identidade%20Visual%20e%20Blocos%20de%20Interface.md).

## Pré-requisitos

Para utilizar este cofre de conhecimento, você precisará ter instalado:

-   Git ([https://git-scm.com/downloads](https://git-scm.com/downloads))
-   Uma conta no GitHub ([https://github.com/](https://github.com/))
-   Obsidian ([https://obsidian.md/](https://obsidian.md/)) ou Visual Studio Code ([https://code.visualstudio.com/](https://code.visualstudio.com/))

## Começando

Seu cofre de conhecimento foi inicializado com sucesso!

Para começar a explorar e organizar suas notas, abra esta pasta no Obsidian ou Visual Studio Code.

➡️ Para uma introdução completa e um guia sobre como usar este cofre, abra a nota **[Guia do Jardineiro Digital](99%20-%20Meta%20e%20Anexos/Guia%20do%20Jardineiro%20Digital.md)**.

Depois, siga **[Exploracao Guiada do Vault](99%20-%20Meta%20e%20Anexos/Exploracao%20Guiada%20do%20Vault.md)** para uma primeira visita de
30 minutos sem precisar entender Git, plugins ou automações de uma vez.

Se este for seu primeiro vault versionado, abra também
**[Preparando seu Computador para o Vault](99%20-%20Meta%20e%20Anexos/Preparando%20seu%20Computador%20para%20o%20Vault.md)** para configurar Obsidian,
VS Code, Git, GitHub Desktop e sincronização sem conflitos entre dispositivos.

Quando a recepção automática do template terminar, abra
**[Depois da Recepcao do Template](99%20-%20Meta%20e%20Anexos/Depois%20da%20Recepcao%20do%20Template.md)** para conferir o que ficou com você,
o que não deve ser sincronizado manualmente e como operar o vault entre
desktop e celular.

## Assistentes de IA

O vault inclui um prompt de projeto em `AGENTS.md` para orientar assistentes de
IA sobre a estrutura PARA, o fluxo com Git e as convenções de escrita.

No Obsidian, plugins de IA da comunidade podem usar esse prompt de duas formas:
aponte o plugin para `AGENTS.md` quando ele aceitar arquivo de contexto, ou cole
o conteúdo de `AGENTS.md` no campo de system prompt/instruções quando ele aceitar
apenas texto.

## Qualidade e Publicação

Se você usa terminal ou CI, rode a validação canônica antes de publicar ou abrir
uma proposta de melhoria:

```bash
pnpm run validate
```

Ela combina lint Markdown, auditoria da arquitetura de informação, auditoria da
sidebar, testes dos scripts, validação do onboarding, revisão de português,
contraste dos temas e Mermaid. O objetivo é manter o vault publicável, navegável
e coerente sem depender de revisão manual em cada mudança.

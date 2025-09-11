# Diretrizes de Contribuição

Agradecemos o seu interesse em contribuir! Este projeto é um vault para Obsidian ou Visual Studio Code (Foam) com o objetivo de ser simples, flexível e pronto para uso. Tratamos nossa base de conhecimento com o mesmo rigor de um projeto de software, uma filosofia conhecida como **"Docs as Code"**.

Este documento é um ponto de partida. A documentação detalhada sobre nossos métodos e convenções reside dentro do próprio cofre.

## Filosofia

- **Idioma Principal:** Toda a documentação, templates e exemplos são escritos em **Português (Brasil)** para garantir acessibilidade.
- **Tom da Escrita:** A comunicação deve ser clara, didática e evitar jargão técnico sempre que possível.
- **Nomes de Arquivos:** Arquivos de notas e templates devem ter nomes descritivos em português. Arquivos de configuração (como `ci.yml`) seguem as convenções da tecnologia (geralmente em inglês).

## Traduções

Contribuições com traduções para outros idiomas são muito bem-vindas! Se desejar traduzir a documentação, por favor, comece criando um arquivo `README.en.md` (para inglês) e submeta um Pull Request.

## Como Contribuir

Existem duas formas principais de contribuir:

1.  **Adicionando Conhecimento:** Editando ou criando notas no cofre.
2.  **Melhorando a Infraestrutura:** Aprimorando o repositório, automações ou configurações.

Independentemente da forma, o processo sempre passará por um fluxo de revisão Git.

### 1. O Fluxo de Trabalho Padrão (Git)

Para garantir controle e qualidade, todas as alterações seguem um processo simples. **Isso inclui o próprio proprietário do projeto, que se submete ao mesmo fluxo de revisão para garantir a integridade e a qualidade do branch principal (`main`).**

1.  **Crie um "Rascunho Seguro" (Branch):** Antes de escrever, crie uma cópia segura do trabalho principal. Use o branch `develop` como base para novas ideias ou melhorias. Para correções urgentes, use o branch `main`. Isso garante que a versão principal esteja sempre estável.
2.  **Faça seus Commits (Salve seu Progresso):** Ao salvar seu trabalho, escreva uma mensagem clara sobre o que você fez. Usamos um padrão chamado [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), que nos ajuda a entender o histórico e a gerar notas de versão automaticamente. Pense nisso como um diário de bordo organizado.
3.  **Abra uma "Proposta de Melhoria" (Pull Request):** Quando seu rascunho estiver pronto, proponha integrá-lo ao trabalho principal. Sua proposta será revisada por outros colaboradores (e por robôs que verificam a qualidade) antes de ser aprovada. É um processo colaborativo que garante que o humano está sempre no controle.

> Para um guia detalhado sobre nosso fluxo de Git, incluindo o uso do branch `develop` e as estratégias de merge, consulte o documento:
> *   **[Fluxo de Trabalho Git: Estratégia de Branches e Merges](./docs/git-workflow.md)**
>
> Para entender como o fluxo de Git se integra ao processo de versionamento e release, consulte os documentos:
> *   **[Usando o Git e o GitHub para Sincronizar seu Vault](./99%20-%20Meta%20&%20Attachments/Usando%20o%20Git%20e%20o%20GitHub%20para%20Sincronizar%20seu%20Vault.md)**
> *   **[Processo de Release e Versionamento](./docs/processo-de-release.md)**

### 2. Princípios e Convenções

Ao adicionar conhecimento ou código, é crucial seguir as convenções que mantêm este cofre organizado e inteligente.

-   **Estrutura e Organização:** As notas devem seguir a metodologia **PARA** e os princípios de **Atomicidade** e **Conectividade**.
-   **Padrões de Escrita:** Utilize os **Templates** e **Mapas de Conteúdo (MOCs)** para manter a consistência.
-   **Agnosticismo:** Lembre-se que a solução deve funcionar no **Obsidian** e no **VS Code**.

> A explicação detalhada de todos os nossos padrões está em:
> **[Convenções e Boas Práticas](./99%20-%20Meta%20&%20Attachments/Convenções%20e%20Boas%20Práticas.md)**

Obrigado por ajudar a construir este projeto!

---
title: O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais)
alias:
  - Versionamento do Conhecimento
  - Ciclo de Vida do Conhecimento
tags:
  - meta/versionamento
  - meta/git
  - meta/workflow
status: published
created: 2023-10-27
updated: 2023-10-27
category: conceito
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Processo de Release]]"
  - "[[git-workflow]]"
---

# O Ciclo de Vida do Conhecimento

Versionar um vault é registrar mudanças importantes nas notas, na estrutura e nas automações. Isso ajuda você a entender o que mudou, voltar atrás quando necessário e compartilhar um estado estável do vault quando fizer sentido.

## Por Que Versionar

- **Rastreabilidade:** saber quando uma nota, estrutura ou automação mudou.
- **Revisão:** conferir mudanças antes de sincronizar ou compartilhar.
- **Recuperação:** voltar para um estado anterior quando algo quebra.
- **Colaboração:** permitir que outra pessoa entenda o histórico do vault.

## Tipos De Mudança

Use Conventional Commits para manter o histórico legível:

| Tipo | Quando usar |
|---|---|
| `fix:` | Correção de link, erro de escrita, configuração ou automação |
| `feat:` | Nova nota, novo fluxo, novo template ou nova automação |
| `refactor:` | Reorganização sem mudar a intenção do conteúdo |
| `docs:` | Ajustes de documentação e explicações |
| `chore:` | Manutenção do repositório |
| `BREAKING CHANGE:` ou `!` | Mudança que exige ação manual, como reorganizar pastas ou atualizar links |

## Changelog E Releases

`CHANGELOG.md` resume mudanças relevantes. Um release marca um ponto do histórico que você quer preservar ou compartilhar.

Para vaults menores ou de uso interno, release pode ser opcional. Para o template original, release ajuda a comunicar mudanças para quem gera novos vaults a partir dele.

## Branches

`main` deve representar o estado principal do vault. Se você quiser experimentar mudanças maiores, use uma branch separada e só faça merge quando revisar o resultado.

Em vaults simples (individual ou de pequena equipe), você pode trabalhar direto em `main` desde que revise o diff antes de sincronizar.

## Próximos Passos

- Para sincronização diária, veja [[Usando o Git e o GitHub para Sincronizar seu Vault]].
- Para automação de release do template original, veja [Processo de Release e Versionamento](../../docs/processo-de-release.md).
- Para estratégia de branches do template original, veja [Fluxo de Trabalho Git](../../docs/git-workflow.md).

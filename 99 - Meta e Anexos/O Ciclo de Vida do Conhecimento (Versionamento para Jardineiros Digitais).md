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
updated: 2026-05-26
category: referencia
audience: todos
related:
  - "[[Guia do Jardineiro Digital]]"
  - "[[Usando o Git e o GitHub para Sincronizar seu Vault]]"
  - "[[Publicando seu Vault como Site]]"
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
| --- | --- |
| `fix:` | Correção de link, erro de escrita, configuração ou automação |
| `feat:` | Nova nota, novo fluxo, novo template ou nova automação |
| `refactor:` | Reorganização sem mudar a intenção do conteúdo |
| `docs:` | Ajustes de documentação e explicações |
| `chore:` | Manutenção do repositório |
| `BREAKING CHANGE:` ou `!` | Mudança que exige ação manual, como reorganizar pastas ou atualizar links |

## Commits Como Histórico

No seu vault, o histórico principal é o próprio Git. Cada commit registra uma mudança que você decidiu preservar: uma nota nova, uma revisão, uma reorganização, uma automação ou uma correção.

Você não precisa manter `CHANGELOG.md`, arquivo `VERSION` ou release formal para usar o vault. Esses mecanismos pertencem a projetos de software que precisam empacotar versões para outras pessoas. Para um vault de conhecimento, commits claros costumam ser o suficiente.

Quando quiser marcar um ponto importante, use uma tag Git ou uma nota de resumo dentro do próprio vault. O mais importante é que o registro continue perto do conteúdo.

## Branches

`main` deve representar o estado principal do vault. Se você quiser experimentar mudanças maiores, use uma branch separada e só faça merge quando revisar o resultado.

Em vaults simples (individual ou de pequena equipe), você pode trabalhar direto em `main` desde que revise o diff antes de sincronizar.

## Próximos Passos

- Para sincronização diária, veja [[Usando o Git e o GitHub para Sincronizar seu Vault]].
- Para publicar notas, veja [[Publicando seu Vault como Site]].

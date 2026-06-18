# Documentação Técnica do Vault

Esta pasta guarda a documentação operacional do projeto `vault-seed`: setup,
Git, GitHub Actions, versionamento, segurança e manutenção do template.

Para aprender a usar o vault como sistema de conhecimento, comece em
`99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md`.

Para preparar um computador de usuário final, use
`99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md`.

## Arquitetura e planejamento

- [Arquitetura e ecossistema](ARCHITECTURE.md) — posicionamento, camadas, IaC de fontes, princípios de design
- [Criando uma distribuição personalizada](creating-a-distribution.md) — fronteira template → vault gerado e contrato do `initialize.yml`
- [Diagrama de camadas](diagrams/ECOSYSTEM.md) — mapa visual do ecossistema DGK

## Comece Aqui

- [Organização técnica do projeto](organizacao-do-projeto.md)
- [Compatibilidade de ambiente e setup](compatibilidade-de-ambiente-e-setup.md)
- [Guia de lint](guia-de-lint.md)
- [Estratégia de plugins do Obsidian](estrategia-plugins-obsidian.md)
- [Mermaid no template](mermaid-no-template.md)
- [Marimo, WASM e ETL](marimo-etl-boundaries.md)
- [Agents Lab](agents-lab.md)

## Git e GitHub

- [Workflow Git](git-workflow.md)
- [Conventional Commits e versionamento automático](conventional-commits-e-versionamento-automatico.md)
- [Estratégia de versionamento](estrategia-de-versionamento.md)
- [Processo de release](processo-de-release.md)
- [Templates de Pull Request](pull-request-templates.md)

## Segurança e manutenção

- [Gerenciando segredos com Git](gerenciando-segredos-com-git.md)
- [Estratégias de backup com Git](estrategias-de-backup-git.md)
- [Removendo arquivos do histórico Git](removendo-arquivos-do-historico-git.md)
- [Limpeza de histórico Git](limpeza-de-historico-git.md)
- [Exemplo prático de limpeza de histórico](exemplo-pratico-limpeza-de-historico.md)

## Testes e validação manual

- [Trilha: site publicado e curadoria editorial](roteiro-teste-site.md) — estado inicial, publicar notas, site privado, auditoria completa
- [Roteiro de teste manual — site e grafo](roteiro-de-teste-manual.md) — visual, mobile, touch, temas, docs técnicas (mantenedor)
- [Trilha: editores](roteiro-teste-editores.md) — Obsidian e VS Code/Foam: abrir, wikilinks, configuração, `dgk note`
- [Trilha: Lab de notebooks](roteiro-teste-lab.md) — WASM, Marimo local, evaluate, curate, export
- [Trilha: ETL e dados do Lab](roteiro-teste-etl.md) — `dgk etl`, idempotência, gitignore em vaults de usuário, teto de migração
- [Trilha: canais de publicação](roteiro-teste-canais.md) — configurar e validar Telegram, Mastodon, etc. via CLI e dashboard
- [Trilha: operação diária](roteiro-teste-operacao.md) — `dgk check`, `dgk inbox`, `dgk note` e o ciclo captura → edição → publicação
- [Trilha: ciclo do outbox](roteiro-teste-outbox.md) — ETL → revisar → dry-run → publicar → rate limits
- [Trilha: painel admin local](roteiro-teste-admin.md) — `dgk serve`, UI de configuração, segurança (CSRF + DNS rebinding)

## Como evitar drift

Use este comando antes de abrir uma Proposta de Melhoria:

```bash
pnpm run validate
```

Ele é a régua canônica do template: valida actions pinadas, lint Markdown,
audit de arquitetura de informação, audit da sidebar, testes, onboarding,
português, contraste dos temas, Mermaid e smokes de template. Para mudanças de
UI ou Lab, rode também `pnpm run site:responsive`.

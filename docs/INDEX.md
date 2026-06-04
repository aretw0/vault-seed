# Documentação Técnica do Vault

Esta pasta guarda a documentação operacional do projeto `vault-seed`: setup,
Git, GitHub Actions, versionamento, segurança e manutenção do template.

Para aprender a usar o vault como sistema de conhecimento, comece em
`99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md`.

Para preparar um computador de usuário final, use
`99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md`.

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

## Como evitar drift

Use este comando antes de abrir uma Proposta de Melhoria:

```bash
pnpm run validate
```

Ele é a régua canônica do template: valida actions pinadas, lint Markdown,
audit de arquitetura de informação, audit da sidebar, testes, onboarding,
português, contraste dos temas, Mermaid e smokes de template. Para mudanças de
UI ou Lab, rode também `pnpm run site:responsive`.

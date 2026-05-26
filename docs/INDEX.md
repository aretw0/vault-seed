# Documentacao Tecnica do Vault

Esta pasta guarda a documentacao operacional do projeto `vault-seed`: setup,
Git, GitHub Actions, versionamento, seguranca e manutencao do template.

Para aprender a usar o vault como sistema de conhecimento, comece em
`99 - Meta e Anexos/Guia do Jardineiro Digital.md`.

Para preparar um computador de usuario final, use
`99 - Meta e Anexos/Preparando seu Computador para o Vault.md`.

## Comece Aqui

- [Organizacao tecnica do projeto](organizacao-do-projeto.md)
- [Compatibilidade de ambiente e setup](compatibilidade-de-ambiente-e-setup.md)
- [Guia de lint](guia-de-lint.md)
- [Estrategia de plugins do Obsidian](estrategia-plugins-obsidian.md)
- [Mermaid no template](mermaid-no-template.md)
- [Marimo, WASM e ETL](marimo-etl-boundaries.md)
- [Agents Lab](agents-lab.md)

## Git e GitHub

- [Workflow Git](git-workflow.md)
- [Conventional Commits e versionamento automatico](conventional-commits-e-versionamento-automatico.md)
- [Estrategia de versionamento](estrategia-de-versionamento.md)
- [Processo de release](processo-de-release.md)
- [Templates de Pull Request](pull-request-templates.md)

## Seguranca e manutencao

- [Gerenciando segredos com Git](gerenciando-segredos-com-git.md)
- [Estrategias de backup com Git](estrategias-de-backup-git.md)
- [Removendo arquivos do historico Git](removendo-arquivos-do-historico-git.md)
- [Limpeza de historico Git](limpeza-de-historico-git.md)
- [Exemplo pratico de limpeza de historico](exemplo-pratico-limpeza-de-historico.md)

## Como evitar drift

Use este comando antes de abrir uma Proposta de Melhoria:

```bash
pnpm run validate
```

Ele é a régua canônica do template: valida actions pinadas, lint Markdown,
audit de arquitetura de informação, audit da sidebar, testes, onboarding,
português, contraste dos temas, Mermaid e smokes de template. Para mudanças de
UI ou Lab, rode também `pnpm run site:responsive`.

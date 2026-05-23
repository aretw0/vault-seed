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

Use estes comandos antes de abrir uma Proposta de Melhoria:

```bash
pnpm run lint
pnpm run validate:onboarding
pnpm run smoke:template
```

O primeiro comando valida o estilo Markdown. O segundo verifica se os arquivos
essenciais de onboarding existem e se os wikilinks do vault apontam para notas
reais. O smoke protege regras de template, como `pnpm`, actions pinadas por SHA
e ausencia de plugins instalados versionados.

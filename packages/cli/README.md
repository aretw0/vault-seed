# @dgk/cli

CLI do Digital Gardening Kit — operação do vault a partir do terminal.

## Instalação

```bash
npm install -g @dgk/cli
# ou via pnpm (recomendado dentro do vault)
pnpm add -D @dgk/cli
```

## Comandos

| Comando | Descrição |
|---|---|
| `dgk validate` | Executa lint, testes, validação de onboarding e smoke |
| `dgk lint` | Lint Markdown em todas as pastas do vault |
| `dgk setup` | Configura git, Python e Node localmente (requer shell POSIX — use devcontainer ou WSL no Windows) |
| `dgk check` | Verifica saúde do vault (links, estrutura PARA) |

## Uso

Execute sempre a partir da raiz do vault:

```bash
dgk validate
```

Ou via pnpm exec sem instalação global:

```bash
pnpm exec dgk validate
```

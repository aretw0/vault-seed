# @aretw0/dgk-cli

CLI do Digital Gardening Kit — operação do vault a partir do terminal.
`dgk` é a camada operacional: comandos do dia a dia (setup, check, evaluate,
etl, outbox) não exigem que você conheça scripts internos de `pnpm`.

## Pré-requisitos

- Node.js >= 22
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — resolve
  dependências Python sob demanda (notebooks Marimo, avaliador de texto,
  curadoria de feeds). Comandos como `dgk lab <notebook>`, `dgk evaluate` e
  `dgk check` exigem `uv` no PATH.
- pnpm — usado internamente por `dgk setup` (instalar `node_modules`) e
  `dgk validate`/`dgk preview` (delegam para os binários que o pnpm resolve).

Depois de instalar os pré-requisitos, rode `dgk setup` e depois `dgk doctor`
para confirmar que o ambiente está pronto.

## Instalação

```bash
npm install -g @aretw0/dgk-cli
# ou via pnpm (recomendado dentro do vault)
pnpm add -D @aretw0/dgk-cli
```

## Comandos

| Comando | Descrição |
|---|---|
| `dgk validate` | Executa lint, testes, validação de onboarding e smoke |
| `dgk lint` | Lint Markdown em todas as pastas do vault |
| `dgk setup` | Configura git, Python e Node localmente (requer shell POSIX — use devcontainer ou WSL no Windows) |
| `dgk doctor` | Diagnostica o ambiente: node, pnpm, uv, python, binários do node_modules |
| `dgk check` | Verifica saúde do vault (links, estrutura PARA, qualidade de texto) |
| `dgk evaluate [nota]` | Avalia qualidade de escrita de uma nota (determinístico, sem API) |

## Uso

Execute sempre a partir da raiz do vault:

```bash
dgk validate
```

Ou via pnpm exec sem instalação global:

```bash
pnpm exec dgk validate
```

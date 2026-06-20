# @aretw0/dgk-runner

Runner de comandos padrão do `@aretw0/dgk-cli`: executa comandos disparando
processos filhos. É uma implementação de referência, deliberadamente mínima,
pensada para ser substituída por `@refarm.dev/dgk-runner` quando o motor do
refarm estiver disponível (ver convergência de ecossistema no `ROADMAP.md`).

## Instalação

```bash
pnpm add @aretw0/dgk-runner
```

## Uso

```js
import { run } from "@aretw0/dgk-runner";

// run(cmd, args, opts) — dispara um processo filho e resolve quando ele termina
await run("git", ["status", "--short"], { cwd: vaultRoot });
```

O `run` é o único ponto de extensão: trocar este pacote por outro runner que
exponha a mesma assinatura permite que o `dgk-cli` rode num motor diferente sem
alterar os comandos.

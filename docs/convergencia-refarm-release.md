# Convergência refarm — runbook de release (file: → npm + release do vault-seed)

Este é o passo de **graduação** do consumo: quando o refarm publica no npm, o vault-seed troca os
`file:vendor/*.tgz` pelas versões publicadas, remove os overrides transitivos, e faz seu próprio release.
Entra no fim do pipeline de assimilação (`convergencia-refarm-logistica.md`).

> **Ordem é crítica.** O refarm publica **primeiro e por completo** (inclusive os transitivos:
> `source-contract-v1`, `identity-contract-v1`, `storage-contract-v1`, `heartwood`). Só então o vault-seed
> troca — senão a resolução npm quebra num transitivo ausente. Todos os 13+ que consumimos têm changeset
> (verificado), então a onda cobre tudo.

## Pré-condição

- refarm rodou `changeset version` + `changeset publish`; os pacotes estão no npm.
- Verificar: `npm view @refarm.dev/records-contract-v1 version` (e amostra dos demais) retorna a versão
  publicada. **Não começar o swap antes disso.**

## Passo 1 — trocar os deps diretos (`package.json`)

`file:vendor/refarm.dev-<pkg>-<v>.tgz` → `^<versão publicada>`, para os 8 diretos:
`channel-policy-v1`, `credentials-contract-v1`, `enrichment-contract-v1`, `identity-heartwood`,
`records-contract-v1`, `source-web`, `storage-memory`, `ds`.

Pinar na versão realmente publicada (não assumir `0.1.0` — o `changeset version` pode ter bumpado).

## Passo 2 — remover os overrides transitivos (`pnpm-workspace.yaml`)

Apagar o bloco `overrides:` das 4 entradas transitivas (`source-contract-v1`, `identity-contract-v1`,
`storage-contract-v1`, `heartwood`) — o npm resolve os transitivos agora.

## Passo 3 — manter o `minimumReleaseAgeExclude: "@refarm.dev/*"`

**Não remover.** Pacotes recém-publicados são mais novos que o `minimumReleaseAge` → sem o exclude, um
`pnpm install` **avisaria** (ou bloquearia) nos `@refarm.dev/*` frescos. O exclude continua correto até os
pacotes "envelhecerem".

## Passo 4 — atualizar os consumer-contract tests (6)

Cada um assere `pkg.dependencies[...] === "file:vendor/..."`. Trocar a asserção para a **versão npm**
(`^x.y.z`) — ou afrouxar para "não é `file:`, resolve do registry". Arquivos:
`refarm_channel_policy_consumer_contract`, `refarm_credentials_consumer_contract`,
`refarm_ds_consumer_contract`, `refarm_enrichment_consumer_contract`, `refarm_records_consumer_contract`,
`refarm_source_web_consumer_contract`. As asserções de **surface** e os **round-trips** (yaml codec,
credentials conformance) não mudam — continuam provando o mesmo contrato, agora do npm.

## Passo 5 — reinstalar + suíte verde

`pnpm install` → `pnpm test`. Tudo verde valida que a resolução npm entrega os mesmos contratos que os
tarballs provaram.

## Passo 6 — limpeza do vendor

Os `vendor/*.tgz` são **gitignored** (vêm do handoff), então remover é só faxina local — nada de git.
**Guardar até o Passo 8** (rollback).

## Passo 7 — release do vault-seed

Seguir o pipeline existente: `changeset` (bump a partir de 0.4.2) → `changeset publish` (npm + PyPI +
template) → sync `main→develop`. Agora o vault-seed consome do registry e publica como produto normal.

## Passo 8 — rollback

Se um dep publicado vier quebrado: reverter aquele dep para `file:vendor/...tgz` + re-add o override
transitivo, `pnpm install`, suíte verde. Por isso os tarballs + o handoff ficam guardados até os deps npm
estarem provados em verde.

## Riscos / notas

- **Atrito de re-extração do pnpm** (visto na sessão): não se aplica aqui — versões npm têm integrity
  própria; o atrito era só de tarball `file:` de mesmo nome+versão trocando de conteúdo.
- **`process-handoff` / `silo`**: consumidos por caminhos que não são `file:` direto no `package.json` (ver
  `-status.md`); conferir se entram no swap ou já resolvem do npm.
- **Coordenação com o release do refarm**: idealmente o refarm avisa "publicado + versões X"; o swap é uma
  passada só, verificável, reversível.

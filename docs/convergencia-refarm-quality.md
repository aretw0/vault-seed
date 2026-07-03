# Convergência: qualidade (`quality:v1` / `ds-lint`) — retirar o hand-rolled

> Doc de desenvolvimento do vault-seed (removido pelo `initialize.yml`). Preparação da convergência dos
> nossos checks de UI/qualidade hand-rolled para os primitivos do refarm.

## Estado

`quality:v1` já foi assimilado via handoff no checkout oficial. A proof está em
[`convergencia-refarm-proof-2026-07-03.md`](./convergencia-refarm-proof-2026-07-03.md):
`@refarm.dev/quality-contract-v1` foi vendorizado, instalado via `file:vendor`,
e provado em `scripts/refarm_quality_consumer_contract.test.mjs` com um profile
downstream emitindo `QualityReport`.

Ainda falta a **adoção de produto**: trocar checks locais hand-rolled por um
profile `quality:v1` real do `vault-seed`, usando o adapter de UI do DS.

## O que o refarm já entregou (upstream)

- **`quality:v1`** (`@refarm.dev/quality-contract-v1`) — o envelope declarado
  rule/finding/profile + `QualityChecker` plugável por domínio. Assimilado via
  handoff 2026-07-03.
- **`ds-lint:v1`** (`@refarm.dev/ds/lint`, refarm `18fac992`) — o lint de UI sobre snapshot renderizado
  (`ds-contrast`, `ds-overflow`, `ds-viewport-overflow`, fluid-type, hierarquia).
- **adapter DS** — `ds-lint:v1` embrulhado como `quality:v1` ui `QualityChecker`
  no pacote `@refarm.dev/ds` (`@refarm.dev/ds/quality-checker` no plano do
  refarm). A adoção downstream ainda precisa ligar o coletor de snapshot a esse
  checker.

## O que o vault-seed tem hand-rolled (a retirar)

| Nosso check | Vira |
|---|---|
| `site_ux_contract.test.mjs` (~243 asserções source-inspect, frágil) | regras `quality:v1` ui via `ds-lint` (contraste/overflow/hierarquia genéricos sobre DOM renderizado) |
| `check_theme.js` (contraste em tokens) | o tier-1 do `ds-lint` (contraste sobre todo par renderizado) |
| `smoke_responsive.mjs` (Playwright + overflow) | **fica** como coletor de snapshot (o host serializa o DOM); alimenta o `QualityChecker` ui |
| `notebook_chart_contrast.test.mjs` | regra de contraste `quality:v1` sobre o snapshot do Marimo |

## A convergência de produto

1. Manter `@refarm.dev/quality-contract-v1` + `@refarm.dev/ds` consumidos pelo
   handoff até o publish; depois trocar `file:` por npm pelo runbook de release.
2. `smoke_responsive` continua coletando o snapshot (Playwright → `DsLintSnapshot`); passa para o
   `createDsQualityChecker()` com um profile vault-seed (`design-default` + regras nossas).
3. **Substituir** as ~243 asserções específicas do `site_ux_contract` por **rodar o `QualityChecker` ui
   sobre as páginas renderizadas** + assertar o `QualityReport` (0 findings `fail`). Genérico, não por-caso.
4. Declarar o profile do vault-seed em `vault.config.json` (`quality`) — "cada um declara suas intenções",
   como já fazemos com status/folders/vocab/records.

**Ganho:** retiramos o frágil (que já quebrou nos nossos refactors) e herdamos o modelo único do DS. O
`smoke_responsive` deixa de ser o dono das regras e vira só o coletor de snapshot — a fronteira certa
(host coleta, checker analisa puro).

## Gate

Pode iniciar quando o adapter `ds-lint→quality:v1` estiver disponível no tarball
`@refarm.dev/ds` consumido localmente. O primeiro passo deve ser um teste
pequeno que roda o checker contra um snapshot fixture; só depois trocar o
`site_ux_contract` amplo.

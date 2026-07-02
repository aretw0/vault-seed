# Convergência: qualidade (quality:v1 / ds-lint) — retirar o hand-rolled

> Doc de desenvolvimento do vault-seed (removido pelo `initialize.yml`). Preparação da convergência dos
> nossos checks de UI/qualidade hand-rolled para os primitivos do refarm quando publicarem.

## O que o refarm já entregou (upstream)

- **`quality:v1`** (`@refarm.dev/quality-contract-v1`, implementado em refarm `a3820bfe`, na leva do 1º
  publish) — o envelope declarado rule/finding/profile + `QualityChecker` plugável por domínio.
- **`ds-lint:v1`** (`@refarm.dev/ds/lint`, refarm `18fac992`) — o lint de UI sobre snapshot renderizado
  (`ds-contrast`, `ds-overflow`, `ds-viewport-overflow`, fluid-type, hierarquia).
- **adapter planejado** — `ds-lint:v1` embrulhado como `quality:v1` ui `QualityChecker`
  (refarm `docs/superpowers/plans/2026-07-02-ds-lint-quality-checker-adapter.md`).

## O que o vault-seed tem hand-rolled (a retirar)

| Nosso check | Vira |
|---|---|
| `site_ux_contract.test.mjs` (~243 asserções source-inspect, frágil) | regras `quality:v1` ui via `ds-lint` (contraste/overflow/hierarquia genéricos sobre DOM renderizado) |
| `check_theme.js` (contraste em tokens) | o tier-1 do `ds-lint` (contraste sobre todo par renderizado) |
| `smoke_responsive.mjs` (Playwright + overflow) | **fica** como coletor de snapshot (o host serializa o DOM); alimenta o `QualityChecker` ui |
| `notebook_chart_contrast.test.mjs` | regra de contraste `quality:v1` sobre o snapshot do Marimo |

## A convergência (quando o refarm publicar)

1. Vendorizar `@refarm.dev/quality-contract-v1` + `@refarm.dev/ds` (com o adapter) via handoff.
2. `smoke_responsive` continua coletando o snapshot (Playwright → `DsLintSnapshot`); passa pro
   `createDsQualityChecker()` com um profile vault-seed (`design-default` + regras nossas).
3. **Substituir** as ~243 asserções específicas do `site_ux_contract` por **rodar o `QualityChecker` ui
   sobre as páginas renderizadas** + assertar o `QualityReport` (0 findings `fail`). Genérico, não por-caso.
4. Declarar o profile do vault-seed em `vault.config.json` (`quality`) — "cada um declara suas intenções",
   como já fazemos com status/folders/vocab/records.

**Ganho:** retiramos o frágil (que já quebrou nos nossos refactors) e herdamos o modelo único do DS. O
`smoke_responsive` deixa de ser o dono das regras e vira só o coletor de snapshot — a fronteira certa
(host coleta, checker analisa puro).

## Gate

Não iniciar antes de: (a) `quality:v1` + `ds` publicados/handoff; (b) o adapter `ds-lint→quality:v1`
existir. Até lá, seguimos com as sementes hand-rolled. Liga o `docs/convergencia-refarm-status.md`.

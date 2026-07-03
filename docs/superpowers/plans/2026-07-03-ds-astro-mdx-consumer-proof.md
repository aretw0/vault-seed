# Prova de consumo `@refarm.dev/ds-astro` para MDX — Plano

> **For agentic workers:** execute task-by-task. This plan is a downstream proof request, not a local
> component-library implementation.

**Goal:** destravar MDX com JSX/componentes sem criar uma biblioteca genérica dentro do `vault-seed`.
O refarm fornece o embed set Astro/MDX product-neutral; o `vault-seed` consome, prova e mantém só
shells, copy, PARA, rotas e wrappers finos.

## Boundary

| Refarm cria | vault-seed prova/possui |
| --- | --- |
| `@refarm.dev/ds-astro` como pacote ou subpath publishable | dependency pin + consumer-contract test |
| `mdx-components` mapping ou história equivalente de imports | uma fixture `.mdx` renderizada pelo site |
| componentes finos sobre `@refarm.dev/ds/html` | wrappers/copy de produto quando necessário |
| blocos product-neutral com props/slots estáveis | data wiring de `vault.config.json`, `records:v1`, PARA e `dgk` |

Não criar em `vault-seed`: `@aretw0/dgk-blocks`, `@aretw0/vault-blocks`,
`content-blocks`, `astro-blocks` ou equivalentes genéricos.

## Upstream package request

Primeiro pacote esperado:

- `@refarm.dev/ds-astro`

Superfície mínima para a primeira proof:

- `Card`, `MetricStrip`, `CalloutSection`, `ContentList`;
- `mdxComponents` ou export equivalente para integração com Astro MDX;
- CSS/tokens herdados de `@refarm.dev/ds`, sem duplicar tema;
- render determinístico suficiente para `ds-lint`/`quality:v1`.

Segunda onda, guiada pelas superfícies reais do `vault-seed`:

- `GraphHero`, `TagCloud`;
- `FacetPanel`, `RecordsList`, `InsightGrid`;
- `NotebookCard`, `AvailabilityBadge`, `CardGrid`;
- `GraphView`, `GraphToolbar`, `GraphLegend`.

## Downstream proof shape

Quando o refarm entregar o pacote/handoff:

1. Vendorizar `@refarm.dev/ds-astro` via `file:vendor/*.tgz` e overrides transitivos, seguindo
   `docs/convergencia-refarm-logistica.md`.
2. Criar `scripts/refarm_ds_astro_consumer_contract.test.mjs` verificando:
   - pin do pacote;
   - exports mínimos (`Card`, `MetricStrip`, `CalloutSection`, `ContentList`, `mdxComponents`);
   - render de fixture sem importar blocos locais genéricos.
3. Adicionar uma fixture `.mdx` publicada e markdown-compatible + componente DS simples.
4. Garantir que `site:build`, `mdx_content_surface_contract`, `site:check` e `lint:docs` passam.
5. Registrar no feedback que o bloco saiu de “render pressure” para “consumer proof received”.

## Acceptance

- Uma página/fixture MDX renderiza pelo site usando `@refarm.dev/ds-astro`.
- O conteúdo continua indexado pelo fluxo `*.md`/`*.mdx` existente.
- Nenhuma rota `/records/` nova aparece.
- Nenhum pacote local genérico de blocos é criado.
- `Explorar` continua shell canônico; blocos reutilizáveis vêm do refarm.

## What stays local

- texto, seções editoriais, labels, rotas e navegação do `vault-seed`;
- mapeamento PARA/folder→type e vocabulário do vault;
- filtros e wiring de dados enquanto forem específicos da rota;
- notebooks, Lab e UX do `dgk`.

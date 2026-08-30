# Adoção do `@refarm.dev/ds` no Lab (4a-consumidor)

> Status: spec de adoção (2026-06-25). Lado **consumidor** do item 4a da convergência: o Lab Marimo
> do vault-seed passa a consumir os tokens do `@refarm.dev/ds` em vez de definir os seus. Espelha o
> spec do fornecedor (`refarm specs/features/2026-06-25-ds-token-contract.md`). Gated: depende do
> `@refarm.dev/ds` existir (consumo dev via tarball — ver `refarm docs/DEV_CROSS_REPO_CONSUMPTION.md`).

## Contexto

O vault-seed tem três superfícies com vocabulários de token diferentes:

- **Site público** → Starlight (`--sl-color-*`), temas `oceano`/`terracota`/`verde-jardim` em
  `.site/styles/themes/*`. Vocabulário próprio do Starlight.
- **Lab Marimo** → vocabulário **shadcn** (`--background`/`--primary`/`--card`/`--foreground`/
  `--muted`/`--accent`/`--border`) + mapa `--gdg-*` da data-grid, em `.site/styles/marimo-vault.css`,
  temado por `[data-vault-marimo-theme="light"|"dark"]`. **É o vocabulário do contrato `ds`.**
- **Admin** (`dgk serve`) → paleta inline própria (item 4b, separado).

O Lab é a **única** superfície que já fala o vocabulário do `ds` — então é o 4a-consumidor. O
bridge `ds → --sl-color-*` do site Starlight fica **deferred**.

## Superfície alvo

`.site/styles/marimo-vault.css`:
- **Migra:** os blocos `:root[data-vault-marimo-theme="light"|"dark"]` que definem
  `--background`/`--primary`/`--card`/`--foreground`/`--muted`/`--accent`/`--border` (+ light/dark).
- **Fica:** o mapa `--gdg-*` (linhas ~167–179; **referência** os vars shadcn, que passam a vir do
  `ds`), os `--vault-marimo-presentation-*`, e o tratamento dos gráficos Altair em shadow DOM
  (**Marimo é dono — não fixar cores aqui**, ver `reference_marimo-lab-rendering`).

## Loop de dogfood (pré-requisito no fornecedor)

O tema `verde-jardim` do `ds` é **autorado a partir dos valores atuais do Lab** (#1b5e3b/#95d5b2 e
cia. em `marimo-vault.css`). Isto é, o que o vault-seed provou vira tema `ds`, e o vault-seed
re-consome. Garantir que o `ds` traga o tema `verde-jardim` (não só o `tractor-green` de referência)
antes desta adoção.

## Migração

1. **Instalar o `ds`** (dev, não-publicado): `pnpm pack` no `ds` → `@refarm.dev/ds` como
   `file:` no `package.json` do vault-seed (ver `refarm docs/DEV_CROSS_REPO_CONSUMPTION.md`).
2. **Importar tokens + tema** no carregamento do Lab: `@refarm.dev/ds/tokens.css` +
   `@refarm.dev/ds/themes/verde-jardim.css`. Mapear `[data-vault-marimo-theme="light"|"dark"]` →
   escopo/modo do `ds` (`[data-refarm-theme="verde-jardim"][data-mode]`), via seletor ou um shim
   curto de atributo.
3. **Remover** de `marimo-vault.css` os blocos shadcn locais (passam a vir do `ds`). **Manter**
   `--gdg-*`, `--vault-marimo-presentation-*`, Altair/shadow-DOM.
4. **Re-exportar** o Lab (`dgk lab` / o pipeline de export) e conferir que o artefato re-exportado
   usa os tokens do `ds` (verificar o artefato, não injetar `!important` — `reference_marimo-lab-rendering`).

## Verificação

1. `dgk lab` renderiza; o roteiro `docs/roteiro-teste-lab.md` passa.
2. Visual `verde-jardim` preservado (os valores do `ds` foram extraídos dos atuais → sem
   regressão de cor); contraste WCAG AA mantido.
3. Data-grid temada (o `--gdg-*` resolve via tokens do `ds`).
4. Gráficos Altair **intactos** (Marimo continua dono do shadow DOM).
5. Sem `!important` novo; a mudança é de **fonte** dos tokens, não de cascata.

## Fora de escopo

- **Bridge `ds → --sl-color-*`** (adoção no site Starlight) — deferred; `oceano`/`terracota` viram
  temas `ds` quando o bridge chegar.
- **Multi-palette no Lab** — o Lab é single-palette (verde-jardim light/dark) hoje; manter.
- **Admin UI** (`dgk serve`) — item 4b (tier string do homestead).
- **Altair/shadow-DOM** — Marimo é dono.

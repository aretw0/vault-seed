# Logística de assimilação refarm → vault-seed (doutrina)

> Unifica o que já temos espalhado (deps, feedback, contract-tests, guards) numa única logística, pra
> o vault-seed **só estender o necessário, nunca reimplementar**, e ser guardião das primitivas junto
> com o refarm. Vale agora porque mais blocos estão chegando (contratos do T3/T2) e a publicação se
> aproxima.

## Princípio

vault-seed é **camada de produto fina** sobre primitivas do refarm. A regra de ouro:

- **Reusável → refarm** (consumimos): process/source/records/enrichment/credentials/secrets/channels/
  artifact/release/UI/health/identity.
- **Produto → nosso** (compomos): labels, comandos `dgk`, PARA, ETL profiles, vocabulário, views,
  cópia de onboarding, escolhas editoriais.

Nunca reimplementar o que o refarm fornece. Quando aparecer dor de um bloco-refarm faltando, o caminho
é **porta-voz** (sinalizar/specar no refarm), não stand-in local.

## O pipeline de assimilação (de um bloco)

1. **Handoff** — refarm empacota o bloco em `.refarm/handoff/vault-seed/<data>/*.tgz`.
2. **Vendor `file:`** — `package.json` → `file:vendor/<pkg>.tgz`; escopo `@refarm.dev/*` isento da
   auditoria via `minimumReleaseAgeExclude` no `pnpm-workspace.yaml`; transitivos não-publicados via
   `overrides:` (raiz). Detalhe: [`convergencia-refarm-deps.md`](./convergencia-refarm-deps.md).
3. **Consumer-contract test** — `scripts/refarm_<pkg>_consumer_contract.test.mjs` fixa o que
   consumimos (pin do `file:` + superfície via `.d.ts`). Padrão dos existentes (ds, ds/html,
   process-handoff).
4. **Adoção atrás de seam de produto** — o bloco entra atrás de uma função/módulo nosso, com
   **degradação graciosa** (import dinâmico opcional) quando o script vai no template do usuário.
5. **Re-sync** — refarm refresca o bloco → re-vendorizar: atualizar `integrity` no lock + bustar a
   entrada do store (cache **por path**, não integrity) + `rm -rf node_modules packages/*/node_modules`.
   Detalhe: [`convergencia-refarm-deps.md`](./convergencia-refarm-deps.md).
6. **Transição publish** — refarm publica → `file:`→`^versão`, remover o `.tgz` de `vendor/`. O escopo
   segue no `minimumReleaseAgeExclude` (é o scope curado do mantenedor). **O código consumidor não
   muda** na transição.

## Guards de guardião (impedem trabalho que não deveria acontecer)

| Guard | Impede |
|---|---|
| `minimumReleaseAgeExclude: ["@refarm.dev/*"]` | clean install quebrar com pacote não-publicado (404) |
| consumer-contract tests | mudança no refarm quebrar nosso consumo em silêncio |
| `distributed_scripts_no_static_refarm_import.test.mjs` | script do template hard-depender do refarm (quebra no repo do usuário) |
| publish-hold `dgk.releaseHold:"refarm-unpublished"` | pacote nosso que depende de refarm não-publicado publicar cedo |
| **(candidato) guard de não-reimplementação** | um módulo nosso crescer uma capacidade que devia ser do refarm — flag pra virar porta-voz em vez de stand-in |

## Loop porta-voz (o lado de cá da relação)

Todo consumo gera feedback (defeitos/lacunas) pro refarm:
- ledger: [`convergencia-refarm-feedback.md`](./convergencia-refarm-feedback.md);
- quando autorizado, specs/ADRs direto no refarm via container (ex.: silo forward-safe, ADR-078,
  contratos do T3/T2). vault-seed é o **primeiro consumidor externo** — o que ele sente vira sinal.

## Transição de publicação (checklist, quando o prazo esquentar)

- [ ] refarm publicou o bloco (npm/crate);
- [ ] `file:vendor/*.tgz` → `^versão` no `package.json` do consumidor;
- [ ] `pnpm install` → lock vira entrada de registry;
- [ ] remover o `.tgz` de `vendor/`;
- [ ] consumer-contract test segue verde (superfície inalterada);
- [ ] remover o publish-hold marker dos nossos pacotes quando suas deps refarm estiverem publicadas.

## Pointers

- Mecanismo `file:`→npm + re-sync + armadilhas pnpm 11: `convergencia-refarm-deps.md`
- Ledger porta-voz: `convergencia-refarm-feedback.md`
- Por-bloco: `convergencia-ds-lab.md`, `convergencia-homestead-admin.md`

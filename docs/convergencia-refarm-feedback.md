# Feedback de consumo pro refarm

vault-seed como primeiro consumidor externo. Captura de defeitos e lacunas dos
pacotes `@refarm.dev/*`. Itens essenciais relayados pro refarm.

## Defeitos (pra refarm corrigir)

| Pacote | Versão | Sintoma | Repro/evidência | Status |
| --- | --- | --- | --- | --- |
| `@refarm.dev/launch-process` | `0.1.0` | `launchDetachedProcess não anexa listener 'error' ao child; num ENOENT (ex.: xdg-open/cmd/open ausente) o spawn emite 'error' sem handler → exceção não-capturada (crash do processo), onde o spawn cru antes rejeitava uma Promise capturável. Exposto via launchVault/openUri (Obsidian), que não é guardado por detect.` | `dist/index.js launchDetachedProcess: spawn(..., {detached:true, stdio:[...]}); child.unref(); — sem child.on('error', ...). Consumido em packages/cli/src/launcher.js (openUri) e commands/vscode.js (openVSCode).` | `corrigido` — refarm `0eb1a193` anexa `child.once('error', e => options.onError?.(e))` (listener sempre presente → crash-safe por padrão; `onError` opcional). Re-vendorizado do handoff `2026-06-28`; dist instalado nos dois consumidores tem o fix; suíte 356/356. |
| `@refarm.dev/ds-astro` | `0.1.0` | (auto-infligido, corrigido) o peer `astro ^6.4.8` aparecia como unmet **só porque o lockfile do vault-seed estava preso em `6.4.4`** — o `6.4.8` já existe (linha 6.x vai até 6.4.8; latest geral do astro é `7.0.6`). **Não** era peer floor à frente do ecossistema (leitura errada minha, retificada). | Bump `astro` `^6.4.4`→`^6.4.8` + `pnpm update astro` → resolve `6.4.8`; `pnpm peers check` = "No peer dependency issues found"; suíte 521/521 + `site:build` 86 páginas verdes. | `corrigido` (fix no vault-seed; NÃO é defeito do refarm) |
| `@refarm.dev/dispatch-surface` (proofId no handoff manifest) | `0.1.0` | `proofTarget` **descreve mal** o pacote: diz "multi-surface command/action **descriptor** substrate" e "dgk exposes product **commands** through dispatch-surface-compatible descriptors" → sugere um **registro de comandos de CLI** (mapear a tabela `COMMANDS` do dgk). Mas a API real é **dispatch de canal/transporte**: `parseTaskTransport` (`file`/`http`/`channel:*`), `ChannelControlSurfaceAdapter`, channel effort payloads pros handlers da runtime HTTP surface, backend Wasm/WIT. O wording induz o consumidor à adoção errada (quase modelei o dispatch do CLI em cima disso). | README do pacote = "Shared primitives for dispatch/control-surface **transport** handling"; `dist/index.d.ts` só re-exporta símbolos channel/transport (zero API de action-descriptor genérico). | `aberto` (relayar — corrigir o wording p/ "channel-dispatch operations", não "product commands"; e classificar dispatch-surface/effort-contract como **vendor-only/runtime**, não alvo de consumo do vault-seed) |

## Lacunas essenciais (backlog pro refarm)

| Pacote | O que falta | Por que é essencial | Workaround | Status |
| --- | --- | --- | --- | --- |
| `@refarm.dev/homestead-ssr` | `fieldHtml` não aceita `attrs` (o `buttonHtml` aceita — inconsistência) | inputs não recebem `autocomplete`/`spellcheck`/`inputmode`/`autocomplete="off"` etc.; campos de token do admin perdem `autocomplete=off`/`spellcheck=false` | montar o `<input>` à mão sem `fieldHtml`, ou pós-processar | `aberto` (relayar — paralelo ao `buttonHtml.attrs`) |
| `@refarm.dev/ds-astro` | peer `astro` fixado em `^6.4.8` (= `<7`) **exclui astro 7**, que já é o latest (`7.0.6`) | qualquer consumidor que migrar pra astro 7 verá o peer do `ds-astro` como unmet; o floor deveria acompanhar o major disponível | ficar em 6.x por ora (vault-seed em 6.4.8, ok); ao migrar pra 7 o peer trava | `aberto` (relayar — alargar pra `^6.4.8 \|\| ^7` ou `>=6.4.8`) |

## Requirements de consumo — `@refarm.dev/silo` (maturação, porta-voz)

> 2026-06-29. Não é defeito nem lacuna pontual: é o **requisito de consumidor** que o
> vault-seed (primeiro consumidor do namespace `channel`/`publishing`) leva ao refarm pra
> o `silo` amadurecer. Histórico: a adoção foi adiada enquanto a superfície de consumo
> amadurecia. Reimplementação original: `packages/cli/src/silo.js` (sync, JSON
> `0600` em `~/.dgk/silo.json`). Em 2026-07-03 a adoção de storage foi feita:
> `packages/cli/src/silo.js` agora delega credenciais para `@refarm.dev/silo`
> em `secrets.publishing`, mantendo fallback para `tokens` legado.

**Convergência que valida a fronteira:** o reserved set de namespaces do silo
(`model | runtime | channel | publishing`, em `collect.d.ts`) é **exatamente** a disciplina
que escrevemos à mão — `SILO_SCOPE = 'publishing-channels'` + *"Model/AI credentials come from
refarm sow… Never add model keys here."* O que codamos como convenção, o silo já modela como
tipo. Nosso silo é consumidor de `channel`/`publishing`; o silo do refarm injeta `model`/`runtime`.

**Eixo do pedido — leve por padrão, seguro por destino:**

- **Leve já:** o storage de tokens/secrets (`SiloCore.saveSecret`/`loadSecret`) **não pode
  arrastar o closure do `KeyManager`/heartwood (WASM)**. Um consumidor só-`channel` não usa
  Ed25519/sign — mesmo princípio do ADR-072 (domínio mais leve correto). Split: subpath de
  storage sem WASM.
- **Seguro como destino:** **afirmamos demanda** pelo roadmap de segurança do silo —
  **v0.2.0 OPAQUE Protection** (cripto-em-repouso de tokens/identity) e **v0.3.0 Sentinel
  Isolation** (WASM isolado + TPM/HSM). Não é feature nova: é puxar a prioridade. A segurança
  que nós e nossos usuários merecemos é o que o ecossistema já planeja — queremos consumi-la.

**Gaps que travam o ocamento (ranqueados):**

| # | Gap | Por que bloqueia o consumidor | Tipo |
| --- | --- | --- | --- |
| 1 | Storage (`saveSecret`/`loadSecret`) arrasta `KeyManager`/heartwood (WASM) | consumidor só-`channel` carrega WASM que não usa; viola domínio-leve (ADR-072) | packaging |
| 2 | Sem enumeração/remoção de secrets namespaced (`listSecrets(ns)`, `removeSecret(ns,id)`) | `loadSecret(ns,id)` é um-a-um; sem listar/remover não dá pra reconstruir `siloStatus` (lista todos) nem `removeService` (apaga conjunto) | API |
| 3 | `CredentialProvider.collect(ctx) → Promise<string>` devolve **uma** string | serviços reais são conjuntos multi-campo (telegram = `BOT_TOKEN` secreto + `CHAT_ID` não-secreto); collect-set ou coleta fica no consumidor | modelo |
| 4 | Sem helper "injeta tokens resolvidos em `process.env` (non-overriding)" | é nosso `injectSiloEnv` (hot path: etl/inbox/lab/outbox); existe `resolve()→Map`/`toGitHubEnv()`, falta o hydrate local | ergonomia |
| 5 | Cripto-em-repouso é roadmap (v0.2.0 OPAQUE), não 0.1.0 | "adotar agora pela segurança" é fraco hoje; valor near-term = convergência de namespace + storage unificado. Pedimos puxar v0.2.0+ | expectativa |
| 6 | Migração `~/.dgk/silo.json` + paridade de file-modes/Windows | `storagePath` deixa fixar `~/.dgk` (✓), falta documentar migração + os modos `0600`/no-op Windows que cuidamos à mão | docs |

**Fica conosco (produto, não vai pro silo):** catálogo `SERVICES` (telegram label/hint/prompts),
`contacts.location` (topologia de canais), e o roteamento canal→outbox. O seam certo é o
`CredentialProvider` do silo — nossos serviços viram providers quando o gap #3 fechar.

**Sinal aterrissado no refarm (porta-voz, 2026-06-29, commit `798b1b45`):** o refarm já tinha a
spec da ponte 8a (`vault-seed-silo-bridge`) e o collection-contract. Não dupliquei — entreguei a
**evidência de consumidor** que a 8a pediu + o que faltava: **ADR-076** (storage sem o closure de
instalação do heartwood + hardening `0600`/`0700`), seção *Consumer Findings* na spec 8a
(evidência de bulk-ops → `listSecrets`/`removeSecret`; collect multi-campo; env-hydrate), e a
**revisão do `ROADMAP.md` do silo**: superfície de consumo dobrada num **v0.1.1 pré-lançamento**
com **contrato de API congelado**, pra OPAQUE (v0.2.0) e Sentinel (v0.3.0) evoluírem o interno sem
churn nos consumidores. Achado verificado no `dist`: heartwood é lazy em runtime (✓) mas hard
`dependency`; e o silo não tem **nenhum** `chmod`/`mode 0600` (nosso `silo.js` à mão é mais
protegido). Adoção (item 8a) segue adiada.

**O refarm respondeu (handoff `2026-06-30`):** implementou tudo — `48d0da33` (closure split:
heartwood→`optionalDependencies`, `index.js` sem import estático de key-manager; `listSecrets`/
`removeSecret`; modos `0600`/`0700`) + `a38ef85f` (**ADR-077 Protection Envelope**: segredo vira
envelope versionado `{value, protection:{scheme:"local-plaintext-v1", encrypted:false,
upgradeTarget:"opaque-envelope-v1"}}` + `describeProtection()`). Dobrou tudo no **first-public
`0.1.0`** (não 0.1.1) com **API congelada**; OPAQUE/Sentinel viram "Post-0.1, internal, surface
frozen". Verificado no `dist`: closure split real (heartwood nunca resolve em storage-only, testado
por contagem de import).

**Adoção downstream (2026-07-03):** `vault-seed` consome o tarball
`@refarm.dev/silo@0.1.0`, grava novos tokens com `SiloCore.saveSecret("publishing", key, value)`,
lista com `listSecrets("publishing")`, remove via `removeSecret`, injeta env de forma non-overriding
e apaga tokens legados no `removeService` para concluir migração local. `contacts.location`,
catálogo de serviços e UX `dgk sow` continuam downstream-owned.

**2ª rodada porta-voz (commit `921f22c1`, via container):** achei defeito de forward-compat
silencioso — `readSecretEnvelope` devolvia `entry.value` pra qualquer envelope, ignorando
`scheme`/`encrypted` → um cliente 0.1.0 leria um envelope OPAQUE futuro como **ciphertext-como-
plaintext**, sem erro. Fix (escolha do usuário: **híbrido**): `loadSecret` lança
`UnreadableSecretError` (`code:"SILO_SECRET_UNREADABLE"`) em envelope ilegível (encrypted/scheme
desconhecido); `listSecrets` omite e mantém os legíveis; legacy/`local-plaintext-v1` seguem; maior
`schemaVersion` com entry legível é tolerado. Torna o `scheme` **executável** no 0.1.0 (forward-safe
por construção). Validado por sonda node mínima (8/8) contra o `src` — suíte vitest/tsc completa fica
pra quando o container liberar (Codex ativo no `cranky_bassi`).

## Avaliação de cobertura

- `launch-process@0.1.0` — cobriu runner async, detached, capture e sync
  (`runLaunchProcessSync`) sem lacuna na adoção do dgk. ✓
- `channel-policy-v1@0.1.0` — cobriu o envelope de entrega do outbox (deliveries
  item×canal, idempotencyKey, contentHash, review gate) e os receipts do telegram
  sem reimplementação residual; validador não-estrito permitiu o superset.
  Consumo com **degradação graciosa** (import dinâmico opcional): scripts
  distribuídos não quebram no repo do usuário sem o pacote. ✓
- `homestead-ssr@0.1.0` — admin do `dgk serve` server-rendered via `shellHtml` +
  render helpers (cards/tabelas `ds`), com módulo de views **isomórfico** reusado no
  cliente (import map → `/_hs/render.js`) sem duplicação. Sinal isomórfico/naming
  relayado ao refarm (`a1afa932`). Lacuna encontrada: `fieldHtml` sem `attrs` (acima). ✓

## Candidatos sinalizados ao refarm (proof-gated)

- **codec YAML-LD ↔ `records:v1`** — refarm spec `2026-06-30-records-yaml-ld-codec-candidate.md`
  (`7b2c1f90`). `records:v1` é JSON-LD; um vault de frontmatter (Obsidian) autora records como
  **YAML-LD**. O codec (parse/serialize, preserve-unknown, forward-safe) é **genérico** e serve
  qualquer consumidor YAML-native; as **convenções** (quais keys→fields) e o **vocabulário** ficam
  downstream (nossa config `records.serialization` no `vault.config.json`). Gate: 2º consumidor. Até
  lá o vault-seed mantém o normalizador local (`scripts/generate_records_data.mjs`) como stand-in,
  não reimplementação divergente. Decisão de serialização: **modelo JSON-LD (refarm) + serialização
  YAML-LD (nossa, por Obsidian)** — camadas, não ou/ou.
- **blocos MDX/Astro/SSR reutilizáveis** — pressão de produto do vault-seed: muita coisa que hoje
  precisa ser Astro deve voltar a ser MDX assim que existir bloco renderizável/empacotável. O refarm
  deve ser a casa dos blocos genéricos (`ds`/homestead/content blocks); o vault-seed consome esses
  blocos e só empacota extensões finas quando forem claramente específicas do produto-vault. Proof
  local em andamento: `Explorar` continua a superfície canônica, agora com ingestão `*.md` + `*.mdx`
  compatível com `@refarm.dev/content-projection` (consumer-contract dev; sem import estático em script
  distribuído), sem criar `/records/` paralelo. O filtro por `@type`/facet de records fica local como
  costura de produto; se evoluir para componente reutilizável de facetas/listas/tabela, deve partir do
  refarm como bloco genérico em vez de virar biblioteca local do vault-seed. Inventário downstream:
  `docs/superpowers/specs/2026-07-03-mdx-block-migration-inventory.md`. O loader publicado já aceita
  `.mdx` markdown-compatible; o que falta para a migração completa é a história de blocos/imports
  reutilizáveis para MDX com componentes. Pedido concreto ao refarm: cultivar `@refarm.dev/ds-astro`
  (embed set sancionado sobre `ds/html`) + uma história de `mdx-components`/imports e blocos
  product-neutral para `GraphHero`, `FacetPanel`, `RecordsList`, `InsightGrid`, `MetricStrip`,
  `NotebookCard`, `AvailabilityBadge`, `CardGrid`, `GraphView`, `GraphToolbar` e `GraphLegend`.
  Até isso existir, o vault-seed não cria pacote local de blocos; mantém shells Astro e wrappers finos.
  Plano de proof downstream: `docs/superpowers/plans/2026-07-03-ds-astro-mdx-consumer-proof.md`.
  **Entregue + assimilado (2026-07-03):** o refarm cultivou `@refarm.dev/ds-astro` (embed set sancionado
  Card/MetricStrip/CalloutSection/ContentList + `mdxComponents`/`dsAstroCssImports` sobre `ds`) e o
  vault-seed assimilou via `file:` tarball do handoff `2026-07-03` (sha256 conferido). Consumer-proof
  verde: `scripts/refarm_ds_astro_consumer_contract.test.mjs` (pin + surface + o mapa MDX resolve pros
  `.astro` embarcados + css imports ficam sobre `@refarm.dev/ds`); suíte completa 521/521, sem regressão.
  Copy/rotas MDX de produto ficam downstream. Nota de fronteira relayada junto: o peer `astro ^6.4.8` do
  ds-astro exclui astro 7 (já latest) — alargar quando um consumidor migrar (acima). O bloco irmão
  `@refarm.dev/content-projection` (MD/MDX→`records:v1`) e o `@refarm.dev/quality-contract-v1`
  também foram assimilados no mesmo handoff (proofs `content-projection.markdown-mdx-records` e
  `quality-contract.declared-lint-envelope`, verdes).

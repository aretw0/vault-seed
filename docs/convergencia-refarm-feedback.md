# Feedback de consumo pro refarm

vault-seed como primeiro consumidor externo. Captura de defeitos e lacunas dos
pacotes `@refarm.dev/*`. Itens essenciais relayados pro refarm.

## Defeitos (pra refarm corrigir)

| Pacote | Versão | Sintoma | Repro/evidência | Status |
| --- | --- | --- | --- | --- |
| `@refarm.dev/launch-process` | `0.1.0` | `launchDetachedProcess não anexa listener 'error' ao child; num ENOENT (ex.: xdg-open/cmd/open ausente) o spawn emite 'error' sem handler → exceção não-capturada (crash do processo), onde o spawn cru antes rejeitava uma Promise capturável. Exposto via launchVault/openUri (Obsidian), que não é guardado por detect.` | `dist/index.js launchDetachedProcess: spawn(..., {detached:true, stdio:[...]}); child.unref(); — sem child.on('error', ...). Consumido em packages/cli/src/launcher.js (openUri) e commands/vscode.js (openVSCode).` | `corrigido` — refarm `0eb1a193` anexa `child.once('error', e => options.onError?.(e))` (listener sempre presente → crash-safe por padrão; `onError` opcional). Re-vendorizado do handoff `2026-06-28`; dist instalado nos dois consumidores tem o fix; suíte 356/356. |

## Lacunas essenciais (backlog pro refarm)

| Pacote | O que falta | Por que é essencial | Workaround | Status |
| --- | --- | --- | --- | --- |
| `@refarm.dev/homestead-ssr` | `fieldHtml` não aceita `attrs` (o `buttonHtml` aceita — inconsistência) | inputs não recebem `autocomplete`/`spellcheck`/`inputmode`/`autocomplete="off"` etc.; campos de token do admin perdem `autocomplete=off`/`spellcheck=false` | montar o `<input>` à mão sem `fieldHtml`, ou pós-processar | `aberto` (relayar — paralelo ao `buttonHtml.attrs`) |

## Requirements de consumo — `@refarm.dev/silo` (maturação, porta-voz)

> 2026-06-29. Não é defeito nem lacuna pontual: é o **requisito de consumidor** que o
> vault-seed (primeiro consumidor do namespace `channel`/`publishing`) leva ao refarm pra
> o `silo` amadurecer. **Adoção adiada** — o silo está conceitualmente certo mas embrionário
> na superfície de consumo. Reimplementação atual: `packages/cli/src/silo.js` (sync, JSON
> `0600` em `~/.dgk/silo.json`).

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
protegido). Adoção (item 8a) segue adiada até o v0.1.1 aterrissar.

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

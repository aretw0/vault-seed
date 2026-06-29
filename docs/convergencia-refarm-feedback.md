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

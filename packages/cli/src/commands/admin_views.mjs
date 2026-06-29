// Isomorphic admin view builders (server SSR + browser updates) over the
// @refarm.dev/ds/html render helpers. Pure: no Node imports, so serve.js
// can serve this file to the browser (import map maps the bare specifier).
import {
  sectionHtml,
  gridHtml,
  cardHtml,
  tableHtml,
  buttonHtml,
  escapeHtml,
} from "@refarm.dev/ds/html";

export function channelsHtml(channels, activeSvc = null) {
  const cards = (channels ?? []).map((ch) => {
    const rows = (ch.keys ?? []).map((k) => {
      const mark = k.configured ? "✓" : "✗";
      const preview = k.preview ? ` <span class="ds-dim">${escapeHtml(k.preview)}</span>` : "";
      return `<div class="ds-key-row"><span>${mark}</span><span>${escapeHtml(k.key)}${preview}</span></div>`;
    });
    const hasAny = (ch.keys ?? []).some((k) => k.configured);
    const actions =
      buttonHtml({ label: "Configurar", variant: "primary", attrs: { "data-act": "cfg" } }) +
      (hasAny ? buttonHtml({ label: "Remover", variant: "danger", attrs: { "data-act": "rm" } }) : "");
    return cardHtml({
      title: ch.label,
      rows,
      active: activeSvc === ch.id,
      actionsHtml: `<div data-svc="${escapeHtml(ch.id)}">${actions}</div>`,
    });
  });
  return sectionHtml("Canais", gridHtml(cards));
}

export function outboxHtml(items) {
  const list = items ?? [];
  if (!list.length) {
    return sectionHtml("Outbox de publicação", `<p class="ds-empty">Outbox vazio — rode: dgk etl</p>`);
  }
  // tableHtml escapes every cell — pass raw values (no double-escaping).
  return sectionHtml(
    "Outbox de publicação",
    tableHtml({
      headers: ["Nota", "Status", "Canais", "Data"],
      rows: list.map((it) => [
        it.title ?? it.path ?? "",
        it.publicationStatus ?? it.status ?? "",
        (it.channels ?? []).join(", "),
        (it.collectedAt ?? "").slice(0, 10),
      ]),
    }),
  );
}

export function rateLimitsHtml(limits) {
  const lims = limits ?? {};
  const ps = Object.keys(lims);
  if (!ps.length) {
    return sectionHtml("Rate limits", `<p class="ds-empty">Sem histórico de rate limits ainda.</p>`);
  }
  return sectionHtml(
    "Rate limits",
    tableHtml({
      headers: ["Plataforma", "Último envio", "Enviados (janela)"],
      rows: ps.map((p) => {
        const d = lims[p] ?? {};
        const last = d.lastSentAt ? new Date(d.lastSentAt).toLocaleTimeString("pt-BR") : "—";
        return [p, last, String(d.sentInWindow ?? 0)];
      }),
    }),
  );
}

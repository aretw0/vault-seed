import { test } from "node:test";
import assert from "node:assert/strict";
import { channelsHtml, outboxHtml, rateLimitsHtml } from "../src/commands/admin_views.mjs";

test("channelsHtml renders ds cards with key rows and action buttons", () => {
  const html = channelsHtml(
    [{ id: "telegram", label: "Telegram", keys: [{ configured: true, key: "TELEGRAM_BOT_TOKEN", preview: "12…ab" }] }],
    "telegram",
  );
  assert.match(html, /ds-section/);
  assert.match(html, /ds-card/);
  assert.match(html, /Telegram/);
  assert.match(html, /TELEGRAM_BOT_TOKEN/);
  assert.match(html, /data-svc="telegram"/);
  assert.match(html, /data-act="cfg"/);
  assert.match(html, /data-act="rm"/); // configured → has remove
  assert.match(html, /data-active="1"/); // activeSvc match
});

test("outboxHtml renders a ds table, escaping cell values once", () => {
  const html = outboxHtml([{ title: "<b>x</b>", path: "a.md", publicationStatus: "draft", channels: ["rss"], collectedAt: "2026-05-26T00:00:00Z" }]);
  assert.match(html, /ds-table/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/); // escaped once (not double)
  assert.match(html, /draft/);
  assert.match(html, /rss/);
  assert.match(html, /2026-05-26/);
});

test("outboxHtml shows an empty state when there are no items", () => {
  assert.match(outboxHtml([]), /Outbox vazio/);
});

test("rateLimitsHtml renders a table or an empty state", () => {
  assert.match(rateLimitsHtml({}), /Sem histórico/);
  assert.match(rateLimitsHtml({ telegram: { sentInWindow: 3 } }), /telegram/);
});

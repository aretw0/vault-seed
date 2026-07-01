import { test, expect } from "vitest";
import { channelsHtml, outboxHtml, rateLimitsHtml } from "../src/commands/admin_views.mjs";

test("channelsHtml renders ds cards with key rows and action buttons", () => {
  const html = channelsHtml(
    [{ id: "telegram", label: "Telegram", keys: [{ configured: true, key: "TELEGRAM_BOT_TOKEN", preview: "12…ab" }] }],
    "telegram",
  );
  expect(html).toMatch(/ds-section/);
  expect(html).toMatch(/ds-card/);
  expect(html).toMatch(/Telegram/);
  expect(html).toMatch(/TELEGRAM_BOT_TOKEN/);
  expect(html).toMatch(/data-svc="telegram"/);
  expect(html).toMatch(/data-act="cfg"/);
  expect(html).toMatch(/data-act="rm"/); // configured → has remove
  expect(html).toMatch(/data-active="1"/); // activeSvc match
});

test("outboxHtml renders a ds table, escaping cell values once", () => {
  const html = outboxHtml([{ title: "<b>x</b>", path: "a.md", publicationStatus: "draft", channels: ["rss"], collectedAt: "2026-05-26T00:00:00Z" }]);
  expect(html).toMatch(/ds-table/);
  expect(html).toMatch(/&lt;b&gt;x&lt;\/b&gt;/); // escaped once (not double)
  expect(html).toMatch(/draft/);
  expect(html).toMatch(/rss/);
  expect(html).toMatch(/2026-05-26/);
});

test("outboxHtml shows an empty state when there are no items", () => {
  expect(outboxHtml([])).toMatch(/Outbox vazio/);
});

test("rateLimitsHtml renders a table or an empty state", () => {
  expect(rateLimitsHtml({})).toMatch(/Sem histórico/);
  expect(rateLimitsHtml({ telegram: { sentInWindow: 3 } })).toMatch(/telegram/);
});

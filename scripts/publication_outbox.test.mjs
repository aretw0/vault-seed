import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPublicationOutbox } from "./prepare_publication_outbox.mjs";
import { validateChannelDeliveryEnvelope } from "@refarm.dev/channel-policy-v1";

test("buildPublicationOutbox extracts only explicit publication candidates", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-outbox-"));
  mkdirSync(join(cwd, "00 - Entrada"), { recursive: true });
  mkdirSync(join(cwd, "40 - Recursos"), { recursive: true });

  writeFileSync(
    join(cwd, "00 - Entrada", "Post.md"),
    [
      "---",
      "title: Post de Teste",
      "description: Gancho de compartilhamento para todos os canais.",
      "status: draft",
      "outbox: true",
      "publicationStatus: draft",
      "canonical: https://example.com/post",
      "source: .dgk/snapshot.json",
      "collectedAt: 2026-05-26T00:00:00.000Z",
      "license: CC-BY-4.0",
      "privacy: public",
      "channels:",
      "  - mastodon",
      "  - rss",
      "---",
      "# Post de Teste",
      "",
      "Resumo auditável do post.",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(cwd, "40 - Recursos", "Nota normal.md"),
    "---\ntitle: Nota normal\nstatus: published\n---\n# Nota normal\n",
    "utf8",
  );

  // Isolate from CI env vars that would make resolveSiteUrl() return a non-null URL.
  const savedRepo = process.env.GITHUB_REPOSITORY;
  const savedSite = process.env.ASTRO_SITE;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.ASTRO_SITE;
  let data;
  try {
    ({ data } = buildPublicationOutbox({
      cwd,
      outputPath: join(cwd, ".dgk", "outbox-publicacao.json"),
      now: "2026-05-26T00:00:00.000Z",
    }));
  } finally {
    if (savedRepo !== undefined) process.env.GITHUB_REPOSITORY = savedRepo;
    if (savedSite !== undefined) process.env.ASTRO_SITE = savedSite;
  }

  assert.equal(data.kind, "publication-outbox");
  assert.equal(data.itemCount, 1);
  assert.equal(data.policy.humanReviewRequired, true);
  assert.deepEqual(data.items[0].channels, ["mastodon", "rss"]);
  assert.equal(data.items[0].license, "CC-BY-4.0");
  // description: author-crafted sharing hook — preferred over excerpt in publish scripts.
  assert.equal(data.items[0].description, "Gancho de compartilhamento para todos os canais.");
  assert.match(data.items[0].excerpt, /Resumo auditável/);
  assert.ok(data.channels.some((channel) => channel.id === "site"));
  // url is null when ASTRO_SITE is unset, CNAME absent, and GITHUB_REPOSITORY absent.
  assert.equal(data.items[0].url, null);
  // tags extracted from frontmatter (absent here → empty array).
  assert.deepEqual(data.items[0].tags, []);

  // Envelope superset (channel-policy-v1): mantém os campos atuais e é válido.
  assert.equal(data.schema, "refarm.channel-delivery-envelope.v1");
  assert.equal(data.producer, "vault-seed:dgk-outbox");
  assert.equal(validateChannelDeliveryEnvelope(data).ok, true);

  // Uma delivery por item×canal (o item declara mastodon + rss).
  assert.equal(data.deliveries.length, 2);
  const mastodon = data.deliveries.find((d) => d.channelId === "mastodon");
  const rss = data.deliveries.find((d) => d.channelId === "rss");
  assert.equal(mastodon.id, `${data.items[0].id}::mastodon`);
  assert.equal(mastodon.contentHash.value, data.items[0].sha256);
  assert.ok(mastodon.idempotencyKey.length > 0);
  // mastodon = risco "médio" → review obrigatória; rss = "baixo" → não obrigatória.
  assert.deepEqual(mastodon.review, { required: true, state: "pending" });
  assert.deepEqual(rss.review, { required: false, state: "not-required" });
});

test("buildPublicationOutbox degrades to the legacy outbox when channel-policy is absent", () => {
  const cwd = mkdtempSync(join(tmpdir(), "vault-outbox-legacy-"));
  mkdirSync(join(cwd, "00 - Entrada"), { recursive: true });
  writeFileSync(
    join(cwd, "00 - Entrada", "Post.md"),
    "---\ntitle: Post\noutbox: true\nchannels:\n  - rss\n---\n# Post\n\nCorpo.\n",
    "utf8",
  );
  const { data } = buildPublicationOutbox({
    cwd,
    outputPath: join(cwd, ".dgk", "outbox-publicacao.json"),
    now: "2026-05-26T00:00:00.000Z",
    channelPolicy: null,
  });
  // Legado: campos atuais presentes, campos do envelope ausentes.
  assert.equal(data.kind, "publication-outbox");
  assert.equal(data.itemCount, 1);
  assert.deepEqual(data.items[0].channels, ["rss"]);
  assert.equal(data.schema, undefined);
  assert.equal(data.deliveries, undefined);
});

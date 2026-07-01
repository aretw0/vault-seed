import { test, expect } from "vitest";
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

  expect(data.kind).toBe("publication-outbox");
  expect(data.itemCount).toBe(1);
  expect(data.policy.humanReviewRequired).toBe(true);
  expect(data.items[0].channels).toEqual(["mastodon", "rss"]);
  expect(data.items[0].license).toBe("CC-BY-4.0");
  // description: author-crafted sharing hook — preferred over excerpt in publish scripts.
  expect(data.items[0].description).toBe("Gancho de compartilhamento para todos os canais.");
  expect(data.items[0].excerpt).toMatch(/Resumo auditável/);
  expect(data.channels.some((channel) => channel.id === "site")).toBeTruthy();
  // url is null when ASTRO_SITE is unset, CNAME absent, and GITHUB_REPOSITORY absent.
  expect(data.items[0].url).toBe(null);
  // tags extracted from frontmatter (absent here → empty array).
  expect(data.items[0].tags).toEqual([]);

  // Envelope superset (channel-policy-v1): mantém os campos atuais e é válido.
  expect(data.schema).toBe("refarm.channel-delivery-envelope.v1");
  expect(data.producer).toBe("vault-seed:dgk-outbox");
  expect(validateChannelDeliveryEnvelope(data).ok).toBe(true);

  // Uma delivery por item×canal (o item declara mastodon + rss).
  expect(data.deliveries.length).toBe(2);
  const mastodon = data.deliveries.find((d) => d.channelId === "mastodon");
  const rss = data.deliveries.find((d) => d.channelId === "rss");
  expect(mastodon.id).toBe(`${data.items[0].id}::mastodon`);
  expect(mastodon.contentHash.value).toBe(data.items[0].sha256);
  expect(mastodon.idempotencyKey.length > 0).toBeTruthy();
  // mastodon = risco "médio" → review obrigatória; rss = "baixo" → não obrigatória.
  expect(mastodon.review).toEqual({ required: true, state: "pending" });
  expect(rss.review).toEqual({ required: false, state: "not-required" });
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
  expect(data.kind).toBe("publication-outbox");
  expect(data.itemCount).toBe(1);
  expect(data.items[0].channels).toEqual(["rss"]);
  expect(data.schema).toBe(undefined);
  expect(data.deliveries).toBe(undefined);
});

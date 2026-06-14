import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPublicationOutbox } from "./prepare_publication_outbox.mjs";

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
      "source: dados/lab/snapshot.json",
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
      outputPath: join(cwd, "dados", "lab", "outbox-publicacao.json"),
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
});

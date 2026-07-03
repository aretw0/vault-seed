import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Test files may static-import @refarm.dev/* (dev-only; excluded by the distributed-scripts guard).
import {
  extractExternalMarkdownLinks,
  extractMarkdownLinks,
  extractWikilinks,
  parseFrontmatter,
  projectContentToRecords,
  validateProjectedRecords,
} from "@refarm.dev/content-projection";

// vault-seed consumes content-projection as the generic MD/MDX -> records:v1
// block. The vault keeps folder/type config and authoring conventions local.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PKG = "@refarm.dev/content-projection";
const TGZ = "file:vendor/refarm.dev-content-projection-0.1.0.tgz";

test("vault-seed pins @refarm.dev/content-projection via the local tarball", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  expect(pkg.dependencies?.[PKG]).toBe(TGZ);
});

test("the consumed content projection surface is exported", () => {
  const dts = readFileSync(join(ROOT, "node_modules", PKG, "dist", "index.d.ts"), "utf8");
  for (const name of [
    "ContentProjectionConfig",
    "ContentProjectionItem",
    "ProjectedContentRecord",
    "parseFrontmatter",
    "extractWikilinks",
    "extractMarkdownLinks",
    "extractExternalMarkdownLinks",
    "projectContentToRecords",
    "validateProjectedRecords",
  ]) {
    expect(dts, `missing ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

test("vault-seed can project MD/MDX content into valid records:v1", () => {
  const md = `---
title: Nota um
status: draft
---
# Nota um

Veja [[notes/two|nota dois]], [nota dois](notes/two.md) e [site](https://example.test).
`;
  const parsed = parseFrontmatter(md);
  expect(parsed.data.title).toBe("Nota um");
  expect(extractWikilinks(parsed.body)).toHaveLength(1);
  expect(extractMarkdownLinks(parsed.body)).toHaveLength(2);
  expect(extractExternalMarkdownLinks(parsed.body)).toHaveLength(1);

  const records = projectContentToRecords(
    [
      { path: "notes/one.md", text: md, mediaType: "text/markdown" },
      {
        path: "notes/two.mdx",
        text: "---\ntitle: Nota dois\n---\n<Callout />\n",
        mediaType: "text/mdx",
      },
    ],
    {
      context: "https://refarm.dev/contexts/records/v1",
      folderTypes: { notes: "KnowledgeRecord" },
      fieldMap: { title: "title", status: "status" },
      includeFrontmatterKeys: ["title", "status"],
      idPrefix: "vault",
      relationType: "mentions",
    },
  );

  expect(records).toHaveLength(2);
  expect(records[0].id).toBe("vaultnotes/one");
  expect(records[0]["@type"]).toContain("KnowledgeRecord");
  expect(records[0].fields).toMatchObject({ title: "Nota um", status: "draft" });
  expect(records[0].relations.map((r) => r.target)).toContain(records[1].id);
  expect(records[0]["content-projection:externalLinks"]?.[0].target).toBe("https://example.test");

  const validation = validateProjectedRecords(records);
  expect(validation.ok, JSON.stringify(validation)).toBe(true);
});

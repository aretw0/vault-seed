#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OPML = join(ROOT, "dados", "fontes", "feeds.opml");
const DEFAULT_OUTPUT = join(ROOT, ".lab", "feeds-assinados.json");

function decodeXml(value = "") {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(source) {
  const attrs = {};
  for (const match of source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g)) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

export function parseOpmlFeeds(opmlText) {
  const subscriptions = [];
  const groups = [];
  const stack = [];

  for (const match of opmlText.matchAll(/<outline\b([^>]*?)(\/)?>|<\/outline>/g)) {
    const token = match[0];
    if (token.startsWith("</outline")) {
      stack.pop();
      continue;
    }

    const attrs = parseAttributes(match[1]);
    const label = attrs.title || attrs.text;
    const selfClosing = Boolean(match[2]) || token.endsWith("/>");

    if (attrs.xmlUrl) {
      const categories = [
        ...stack,
        ...(attrs.category || "")
          .split(",")
          .map((category) => category.trim())
          .filter(Boolean),
      ];
      subscriptions.push({
        id: slugify(attrs.xmlUrl || label),
        title: label || attrs.xmlUrl,
        xmlUrl: attrs.xmlUrl,
        htmlUrl: attrs.htmlUrl || null,
        type: attrs.type || "rss",
        description: attrs.description || null,
        categories: Array.from(new Set(categories)),
      });
    } else if (label) {
      groups.push(label);
      if (!selfClosing) stack.push(label);
    }
  }

  return { groups: Array.from(new Set(groups)), subscriptions };
}

export function slugify(input) {
  return String(input || "feed")
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "feed";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function opmlDateCreated(opmlText) {
  const match = opmlText.match(/<dateCreated>([\s\S]*?)<\/dateCreated>/i);
  if (!match) return null;
  const parsed = new Date(decodeXml(match[1].trim()));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildFeedSourcesDataset({
  opmlPath = DEFAULT_OPML,
  outputPath = DEFAULT_OUTPUT,
  now,
} = {}) {
  const opml = readFileSync(opmlPath, "utf8");
  const parsed = parseOpmlFeeds(opml);
  const collectedAt = now || opmlDateCreated(opml) || new Date(0).toISOString();
  const payloadWithoutHash = {
    schemaVersion: 1,
    kind: "feed-subscriptions",
    source: opmlPath.replace(ROOT, "").replaceAll("\\", "/").replace(/^\//, ""),
    collectedAt,
    license: "user-provided",
    privacy: "public-feed-list",
    groups: parsed.groups,
    subscriptionCount: parsed.subscriptions.length,
    subscriptions: parsed.subscriptions,
  };
  const payload = {
    ...payloadWithoutHash,
    sha256: sha256(JSON.stringify(payloadWithoutHash, null, 2)),
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { data: payload, outputPath };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { data, outputPath } = buildFeedSourcesDataset();
  console.log(`feed sources: ${data.subscriptionCount} feed(s) -> ${outputPath}`);
}

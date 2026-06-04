import assert from "node:assert/strict";
import test from "node:test";
import { parseOpmlFeeds } from "./prepare_feed_sources.mjs";

test("parseOpmlFeeds extracts nested RSS subscriptions with categories", () => {
  const parsed = parseOpmlFeeds(`<?xml version="1.0"?>
  <opml version="2.0"><body>
    <outline text="Tecnologia">
      <outline text="Exemplo" title="Feed Exemplo" type="rss" xmlUrl="https://example.com/feed.xml" htmlUrl="https://example.com" category="web, pesquisa" />
    </outline>
  </body></opml>`);

  assert.deepEqual(parsed.groups, ["Tecnologia"]);
  assert.equal(parsed.subscriptions.length, 1);
  assert.equal(parsed.subscriptions[0].title, "Feed Exemplo");
  assert.equal(parsed.subscriptions[0].xmlUrl, "https://example.com/feed.xml");
  assert.deepEqual(parsed.subscriptions[0].categories, ["Tecnologia", "web", "pesquisa"]);
});

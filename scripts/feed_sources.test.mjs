import { test, expect } from "vitest";
import { parseOpmlFeeds } from "./prepare_feed_sources.mjs";

test("parseOpmlFeeds extracts nested RSS subscriptions with categories", () => {
  const parsed = parseOpmlFeeds(`<?xml version="1.0"?>
  <opml version="2.0"><body>
    <outline text="Tecnologia">
      <outline text="Exemplo" title="Feed Exemplo" type="rss" xmlUrl="https://example.com/feed.xml" htmlUrl="https://example.com" category="web, pesquisa" />
    </outline>
  </body></opml>`);

  expect(parsed.groups).toEqual(["Tecnologia"]);
  expect(parsed.subscriptions.length).toBe(1);
  expect(parsed.subscriptions[0].title).toBe("Feed Exemplo");
  expect(parsed.subscriptions[0].xmlUrl).toBe("https://example.com/feed.xml");
  expect(parsed.subscriptions[0].group).toBe("Tecnologia");
  expect(parsed.subscriptions[0].categories).toEqual(["Tecnologia", "web", "pesquisa"]);
});

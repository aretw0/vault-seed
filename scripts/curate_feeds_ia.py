#!/usr/bin/env python3
"""CI script: classifies recent feed items using Claude API.

Reads feeds-assinados.json, fetches up to MAX_FEEDS feeds, calls Claude to
rank items by relevance, and writes .dgk/curadoria-feeds.json.

Requires: ANTHROPIC_API_KEY env var, uv run --with anthropic.
Run via: uv run --with anthropic python scripts/curate_feeds_ia.py
"""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import defusedxml.ElementTree as ET
from llm_client import call_llm, resolve_provider

ROOT = Path(__file__).resolve().parent.parent
FEEDS_SOURCE = ROOT / "\.dgk" / "feeds-assinados.json"
OUTPUT = ROOT / "\.dgk" / "curadoria-feeds.json"
MAX_FEEDS = 5
MAX_ITEMS_PER_FEED = 10
USER_AGENT = "vault-seed-lab/1.0"


def _text(el, names):
    for name in names:
        child = el.find(name)
        if child is not None and child.text:
            return child.text.strip()
    return ""


def fetch_feed(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        xml = resp.read().decode(resp.headers.get_content_charset() or "utf-8", "replace")
    root = ET.fromstring(xml)
    items = []
    channel = root.find("channel")
    if channel is not None:
        for item in channel.findall("item")[:MAX_ITEMS_PER_FEED]:
            items.append({
                "title": _text(item, ["title"]),
                "summary": _text(item, ["description", "summary"])[:200],
                "url": _text(item, ["link"]),
                "published": _text(item, ["pubDate"])[:10],
            })
    else:
        atom = "{http://www.w3.org/2005/Atom}"
        for entry in root.findall(f"{atom}entry")[:MAX_ITEMS_PER_FEED]:
            link_el = entry.find(f"{atom}link")
            items.append({
                "title": _text(entry, [f"{atom}title"]),
                "summary": _text(entry, [f"{atom}summary", f"{atom}content"])[:200],
                "url": link_el.attrib.get("href", "") if link_el is not None else "",
                "published": _text(entry, [f"{atom}published"])[:10],
            })
    return items


def classify_batch(batch, env=None, http_post=None):
    items_text = "\n".join(
        f"{i + 1}. [{item['feed']}] {item['title']}: {item['summary'][:100]}"
        for i, item in enumerate(batch)
    )
    prompt = (
        "Você é um assistente de curadoria de PKM. Classifique cada item de feed abaixo.\n"
        "Para cada item, retorne um JSON array com objetos: "
        '{"index": N, "relevance": "high"|"medium"|"low", "topic": "string", "reason": "frase curta"}.\n'
        "Retorne APENAS o JSON array, sem texto adicional.\n\n"
        f"Itens:\n{items_text}"
    )
    kwargs = {"env": env} if env is not None else {}
    if http_post is not None:
        kwargs["http_post"] = http_post
    return json.loads(call_llm(prompt, **kwargs))


def main():
    provider = resolve_provider()
    if not provider:
        print("curate_feeds_ia: nenhum provedor LLM configurado, pulando.", file=sys.stderr)
        print("  Defina ANTHROPIC_API_KEY, GROQ_API_KEY, OPENAI_API_KEY ou DGK_LLM_BASE_URL.", file=sys.stderr)
        sys.exit(0)

    if not FEEDS_SOURCE.exists():
        print(f"curate_feeds_ia: {FEEDS_SOURCE} não encontrado.", file=sys.stderr)
        sys.exit(0)

    feeds_data = json.loads(FEEDS_SOURCE.read_text("utf-8"))
    subs = [s for s in feeds_data.get("subscriptions", []) if s.get("xmlUrl") and not s["xmlUrl"].startswith(".")]

    collected = []
    for sub in subs[:MAX_FEEDS]:
        url = sub["xmlUrl"]
        try:
            items = fetch_feed(url)
            for item in items:
                collected.append({**item, "feed": sub.get("title", url), "grupo": sub.get("group") or "—"})
            print(f"  {sub.get('title', url)}: {len(items)} itens")
        except Exception as exc:
            print(f"  erro em {sub.get('title', url)}: {exc}", file=sys.stderr)

    if not collected:
        print("curate_feeds_ia: nenhum item coletado.", file=sys.stderr)
        sys.exit(0)

    print(f"curate_feeds_ia: classificando {len(collected)} itens via {provider}…")
    try:
        classifications = classify_batch(collected[:20])
        class_map = {c["index"] - 1: c for c in classifications}
    except Exception as exc:
        print(f"curate_feeds_ia: erro no LLM: {exc}", file=sys.stderr)
        sys.exit(0)

    enriched = []
    for i, item in enumerate(collected[:20]):
        cls = class_map.get(i, {})
        enriched.append({
            **item,
            "relevance": cls.get("relevance", "unknown"),
            "topic": cls.get("topic", "—"),
            "reason": cls.get("reason", "—"),
        })
    enriched.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x["relevance"], 3))

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "schemaVersion": 1,
        "source": "scripts/curate_feeds_ia.py",
        "provider": provider,
        "collectedAt": now,
        "itemCount": len(enriched),
        "items": enriched,
    }
    payload["sha256"] = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"curate_feeds_ia: {len(enriched)} itens classificados -> {OUTPUT}")


if __name__ == "__main__":
    main()

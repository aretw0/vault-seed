import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from _lab_notebook_runtime import (
        fetch_local_feed,
        get_local_secret,
        is_pyodide_runtime,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    feeds_data = read_lab_dataset("feeds-assinados", manifest)
    context = lab_runtime_context()
    return context, feeds_data, fetch_local_feed, get_local_secret, is_pyodide_runtime, manifest


@app.cell
def _(context, feeds_data, mo):
    mo.vstack([
        mo.md(f"""
# Curadoria de feeds com IA

Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

| Capacidade | WASM | Local | CI |
|---|:---:|:---:|:---:|
| Assinaturas do bundle | ✓ | ✓ | ✓ |
| Coletar feeds ao vivo | — | ✓ | ✓ |
| Classificar itens com Claude API | — | ✓ | ✓ |
| Salvar curadoria no vault | — | ✓ | ✓ |

- feeds assinados: **{feeds_data.get("subscriptionCount", 0)}**
- última coleta: `{feeds_data.get("collectedAt", "—")[:10]}`

O notebook coleta itens recentes dos feeds assinados e usa a Claude API para classificar
relevância por tópico de interesse. Nenhum item é descartado automaticamente — a IA
sugere prioridade, a decisão final é humana.
"""),
    ])
    return


@app.cell
def _(feeds_data, mo):
    import pandas as pd

    subs = feeds_data.get("subscriptions", [])
    sub_df = pd.DataFrame([
        {"título": s.get("title"), "grupo": s.get("group") or "—", "feed": s.get("xmlUrl")}
        for s in subs
    ])
    mo.vstack([
        mo.md("## Assinaturas disponíveis"),
        mo.ui.table(sub_df),
    ])
    return (pd,)


@app.cell
def _(context, feeds_data, fetch_local_feed, mo, pd):
    if not context["isLocal"]:
        collected_items = []
        collect_result = mo.vstack([
            mo.md("## Coleta de itens (local)"),
            mo.callout(
                mo.md("Execute localmente para coletar itens recentes de todos os feeds antes de classificar."),
                kind="info",
            ),
        ])
    else:
        _subs = feeds_data.get("subscriptions", [])
        _max_feeds = 5
        _max_items_per_feed = 10
        collected_items = []
        errors = []
        for _sub in _subs[:_max_feeds]:
            _url = _sub.get("xmlUrl", "")
            if not _url or _url.startswith("."):
                continue
            try:
                _feed = fetch_local_feed(_url, limit=_max_items_per_feed)
                for _item in _feed.get("items", []):
                    collected_items.append({
                        "feed": _sub.get("title", _url),
                        "grupo": _sub.get("group") or "—",
                        "título": _item.get("title", ""),
                        "url": _item.get("url", ""),
                        "publicado": (_item.get("published") or "")[:10],
                        "resumo": (_item.get("summary") or "")[:200],
                    })
            except Exception as _exc:
                errors.append(f"{_sub.get('title', _url)}: {_exc}")

        parts = [mo.md(f"## Coleta de itens (local)\n\n{len(collected_items)} itens de {min(_max_feeds, len(_subs))} feeds")]
        if errors:
            parts.append(mo.callout(mo.md("Erros:\n" + "\n".join(f"- {e}" for e in errors)), kind="warn"))
        if collected_items:
            parts.append(mo.ui.table(pd.DataFrame(collected_items).head(30)))
        collect_result = mo.vstack(parts)

    collect_result
    return (collected_items,)


@app.cell
def _(context, get_local_secret, mo):
    if not context["isLocal"]:
        key_result = mo.vstack([
            mo.md("## Chave da Claude API (local)"),
            mo.callout(
                mo.md(
                    "Configure `ANTHROPIC_API_KEY` no ambiente para ativar a classificação:\n\n"
                    "```sh\nexport ANTHROPIC_API_KEY=sk-ant-...\nuv run marimo edit curadoria-feeds-ia.py\n```"
                ),
                kind="info",
            ),
        ])
    else:
        _key = get_local_secret("ANTHROPIC_API_KEY")
        if _key:
            _preview = _key[:8] + "…" + _key[-4:]
            key_result = mo.callout(
                mo.md(f"`ANTHROPIC_API_KEY` configurada: `{_preview}`. A classificação está disponível."),
                kind="success",
            )
        else:
            key_result = mo.vstack([
                mo.md("## Chave da Claude API (local)"),
                mo.callout(
                    mo.md(
                        "`ANTHROPIC_API_KEY` ausente. Configure no ambiente:\n\n"
                        "```sh\nexport ANTHROPIC_API_KEY=sk-ant-...\n```"
                    ),
                    kind="warn",
                ),
            ])

    key_result
    return


@app.cell
def _(collected_items, context, get_local_secret, mo):
    if not context["isLocal"]:
        classify_run = mo.ui.checkbox(label="Classificar itens (requer modo local)", value=False, disabled=True)
    else:
        _key = get_local_secret("ANTHROPIC_API_KEY")
        _count = len(collected_items)
        classify_run = mo.ui.checkbox(
            label=f"Classificar {_count} itens coletados com Claude API",
            value=False,
            disabled=not (_key and collected_items),
        )
    mo.vstack([
        mo.md("## Classificação com IA"),
        classify_run,
        mo.md(
            "O modelo recebe um lote de títulos e resumos e retorna para cada item:\n"
            "- `relevance`: `high`, `medium` ou `low`\n"
            "- `topic`: categoria identificada (`pkm`, `engenharia`, `ia`, `ferramentas`, etc.)\n"
            "- `reason`: frase curta explicando a classificação\n\n"
            "O vault permanece como fonte de verdade — a IA não escreve notas, apenas sugere prioridade."
        ),
    ])
    return (classify_run,)


@app.cell
def _(classify_run, collected_items, context, get_local_secret, mo, pd):
    if not context["isLocal"] or not classify_run.value or not collected_items:
        classify_result = mo.md("")
    else:
        import json as _json
        from urllib.request import Request as _Req, urlopen as _urlopen

        _key = get_local_secret("ANTHROPIC_API_KEY")
        if not _key:
            classify_result = mo.callout(mo.md("`ANTHROPIC_API_KEY` ausente."), kind="warn")
        else:
            _batch = collected_items[:20]
            _items_text = "\n".join(
                f"{i + 1}. [{item['feed']}] {item['título']}: {item['resumo'][:100]}"
                for i, item in enumerate(_batch)
            )
            _prompt = (
                "Você é um assistente de curadoria de PKM. Classifique cada item de feed abaixo.\n"
                "Para cada item, retorne um JSON array com objetos: "
                '{"index": N, "relevance": "high"|"medium"|"low", "topic": "string", "reason": "frase curta"}.\n'
                "Retorne APENAS o JSON array, sem texto adicional.\n\n"
                f"Itens:\n{_items_text}"
            )
            try:
                _req = _Req(
                    "https://api.anthropic.com/v1/messages",
                    data=_json.dumps({
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": _prompt}],
                    }).encode(),
                    headers={
                        "x-api-key": _key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    method="POST",
                )
                with _urlopen(_req, timeout=30) as _resp:
                    _response = _json.loads(_resp.read())
                _text = _response["content"][0]["text"].strip()
                _classifications = _json.loads(_text)
                _class_map = {c["index"] - 1: c for c in _classifications}
                _enriched = []
                for _i, _item in enumerate(_batch):
                    _cls = _class_map.get(_i, {})
                    _enriched.append({
                        "relevância": _cls.get("relevance", "—"),
                        "tópico": _cls.get("topic", "—"),
                        "feed": _item["feed"],
                        "título": _item["título"],
                        "razão": _cls.get("reason", "—"),
                        "url": _item["url"],
                    })
                _enriched.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x["relevância"], 3))
                classify_result = mo.vstack([
                    mo.md(f"### {len(_enriched)} itens classificados"),
                    mo.ui.table(pd.DataFrame(_enriched)),
                ])
            except Exception as _exc:
                classify_result = mo.callout(mo.md(f"Erro na chamada à Claude API: {_exc}"), kind="warn")

    classify_result
    return


@app.cell
def _(mo):
    mo.md(
        "## Uso no CI\n\n"
        "O workflow `refresh-lab-data.yml` executa a curadoria automaticamente quando "
        "`ANTHROPIC_API_KEY` está configurado como secret do repositório:\n\n"
        "```\nSettings → Secrets and variables → Actions → New repository secret\nName: ANTHROPIC_API_KEY\n```\n\n"
        "O passo de curadoria usa `claude-haiku-4-5-20251001` para manter custo baixo. "
        "O resultado é commitado em `.lab/curadoria-feeds.json` com `[skip ci]`."
    )
    return


if __name__ == "__main__":
    app.run()

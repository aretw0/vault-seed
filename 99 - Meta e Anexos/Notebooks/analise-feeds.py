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
        fetch_wasm_feed,
        is_pyodide_runtime,
        lab_altair_chart,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    feeds = read_lab_dataset("feeds-assinados", manifest)
    context = lab_runtime_context()
    return (
        context,
        feeds,
        fetch_local_feed,
        fetch_wasm_feed,
        is_pyodide_runtime,
        lab_altair_chart,
    )


@app.cell
def _(context, feeds, mo):
    mo.vstack([
        mo.md(f"""
    # Radar de feeds

    Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

    | Capacidade | WASM | Local | CI |
    |---|:---:|:---:|:---:|
    | Assinaturas do bundle | ✓ | ✓ | ✓ |
    | Itens ao vivo (feed público CORS-ok) | ✓ | — | — |
    | Todos os feeds ao vivo | — | ✓ | ✓ |
    | Análise de itens por grupo | — | ✓ | ✓ |

    - feeds assinados: **{feeds["subscriptionCount"]}**
    - última coleta: `{feeds["collectedAt"]}`
    - fingerprint: `{feeds["sha256"][:16]}…`
    """),
    ])
    return


@app.cell
def _(feeds, mo):
    import pandas as pd
    from urllib.parse import urlparse

    subscriptions = feeds.get("subscriptions", [])
    rows = []
    for sub in subscriptions:
        url = sub.get("xmlUrl") or ""
        html_url = sub.get("htmlUrl") or ""
        parsed = urlparse(url if "://" in url else html_url)
        rows.append({
            "título": sub.get("title"),
            "domínio": parsed.netloc or "local",
            "grupo": sub.get("group") or "—",
            "feed": url,
        })
    feeds_df = pd.DataFrame(rows)
    mo.vstack([
        mo.md("## Assinaturas"),
        mo.ui.table(feeds_df),
    ])
    return feeds_df, pd


@app.cell
async def _(fetch_wasm_feed, is_pyodide_runtime, mo, pd):
    if not is_pyodide_runtime():
        wasm_live = None
        wasm_result = mo.vstack([
            mo.md("## Itens ao vivo (WASM)"),
            mo.callout(
                mo.md("Abra este notebook no browser para buscar itens ao vivo do GitHub Blog sem instalar nada."),
                kind="info",
            ),
        ])
    else:
        try:
            wasm_live = await fetch_wasm_feed("https://github.blog/feed/")
            live_df = pd.DataFrame(wasm_live.get("items", []))[["title", "url", "published"]]
            wasm_result = mo.vstack([
                mo.md(f"## Itens ao vivo (WASM)\n\n**{wasm_live['title']}** · {wasm_live['itemCount']} itens recentes"),
                mo.ui.table(live_df),
            ])
        except Exception as exc:
            wasm_live = None
            wasm_result = mo.vstack([
                mo.md("## Itens ao vivo (WASM)"),
                mo.callout(mo.md(f"Não foi possível buscar o feed: {exc}"), kind="warn"),
            ])
    wasm_result
    return


@app.cell
def _(context, feeds, fetch_local_feed, mo, pd):
    if not context["isLocal"]:
        local_items_df = pd.DataFrame()
        local_result = mo.vstack([
            mo.md("## Coleta local"),
            mo.callout(
                mo.md(
                    "Execute com `uv run marimo edit` para coletar todos os feeds ao vivo "
                    "e ver a análise de itens por período."
                ),
                kind="info",
            ),
        ])
    else:
        all_items = []
        errors = []
        for _sub in feeds.get("subscriptions", []):
            _url = _sub.get("xmlUrl", "")
            if not _url or _url.startswith("."):
                continue
            try:
                _result = fetch_local_feed(_url)
                for _item in _result.get("items", []):
                    all_items.append({
                        "feed": _sub.get("title", _url),
                        "grupo": _sub.get("group") or "—",
                        "título": _item.get("title"),
                        "publicado": _item.get("published"),
                        "url": _item.get("url"),
                    })
            except Exception as _exc:
                errors.append(f"{_sub.get('title', _url)}: {_exc}")

        local_items_df = pd.DataFrame(all_items) if all_items else pd.DataFrame()
        parts = [mo.md(f"## Coleta local\n\n{len(all_items)} itens coletados de {feeds['subscriptionCount']} feeds.")]
        if errors:
            parts.append(mo.callout(
                mo.md("Feeds com erro:\n" + "\n".join(f"- {e}" for e in errors)),
                kind="warn",
            ))
        if not local_items_df.empty:
            parts.append(mo.ui.table(local_items_df.head(100)))
        local_result = mo.vstack(parts)

    local_result
    return


@app.cell
def _(feeds_df, lab_altair_chart, mo):
    import altair as alt

    if feeds_df.empty:
        coverage_result = mo.md("_Sem dados de assinaturas._")
    else:
        group_df = (
            feeds_df.groupby("grupo", dropna=False)
            .size()
            .reset_index(name="feeds")
            .sort_values("feeds", ascending=False)
        )
        chart = lab_altair_chart(
            alt.Chart(group_df)
            .mark_bar()
            .encode(
                x=alt.X("feeds:Q", title="feeds"),
                y=alt.Y("grupo:N", sort="-x", title=None),
                color=alt.value("#2d7a4d"),
                tooltip=["grupo", "feeds"],
            )
            .properties(height=max(80, len(group_df) * 28), title="Feeds por grupo")
        )
        coverage_result = mo.vstack([
            mo.md("## Cobertura por grupo"),
            mo.ui.altair_chart(chart),
        ])
    coverage_result
    return


@app.cell
def _(feeds, mo):
    from datetime import datetime, timezone

    collected = feeds.get("collectedAt", "")
    if collected and collected != "1970-01-01T00:00:00.000Z":
        try:
            dt = datetime.fromisoformat(collected.replace("Z", "+00:00"))
            age_h = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            freshness = f"{age_h:.0f}h atrás" if age_h < 48 else f"{age_h / 24:.0f} dias atrás"
        except Exception:
            freshness = collected
    else:
        freshness = "dados de exemplo (timestamp de época)"

    mo.vstack([
        mo.md(f"""## Atualização automática (CI)

    Os dados em `feeds-assinados.json` são gerados por `pnpm run feeds:opml` e
    podem ser mantidos frescos pelo workflow `refresh-lab-data.yml`.

    - última coleta: **{freshness}**
    - fonte: `{feeds.get("source", "—")}`

    Para ativar o refresh diário, copie `.github/workflows/refresh-lab-data.yml`
    do repositório do template para o seu vault.
    """),
    ])
    return


@app.cell
def _(feeds_df, mo, pd):
    candidates = []
    for _, _row in feeds_df.iterrows():
        title = _row.get("título") or _row.get("domínio") or "Feed"
        candidates.append({
            "arquivo sugerido": f"00 - Entrada/Feed - {title}.md",
            "título": f"Feed - {title}",
            "fonte": _row.get("feed"),
            "próximo passo": "decidir se vira fonte recorrente, nota de leitura ou descarte",
        })
    candidates_df = pd.DataFrame(candidates)
    mo.vstack([
        mo.md(
            "## Candidatas para inbox\n\n"
            "A tabela abaixo não cria notas automaticamente. "
            "Ela mostra o formato de triagem: feed observado → decisão humana."
        ),
        mo.ui.table(candidates_df),
    ])
    return


if __name__ == "__main__":
    app.run()

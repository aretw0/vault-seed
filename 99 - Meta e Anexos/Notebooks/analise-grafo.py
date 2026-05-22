import marimo

app = marimo.App(width="medium", title="Análise de Grafo")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    return json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore
        data = json.loads(open_url("./vault-data.json").read())
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "lab", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(data, mo, notes):
    mo.md(
        f"# 🕸️ Análise de Grafo\n\n"
        f"**{len(notes)} notas** · gerado em `{data['generated'][:10]}`"
    )
    return ()


@app.cell
def _(notes):
    all_slugs = {n["id"] for n in notes}
    inverse_index: dict[str, list[str]] = {n["id"]: [] for n in notes}
    for _n in notes:
        for _link in _n.get("links", []):
            if _link in inverse_index:
                inverse_index[_link].append(_n["id"])
    return all_slugs, inverse_index


@app.cell
def _(inverse_index, mo, notes):
    import pandas as pd

    _orphans = [
        n for n in notes
        if not n.get("links") and not inverse_index.get(n["id"])
    ]
    mo.md(f"## 🏝️ Notas Órfãs\n\n{len(_orphans)} notas sem links de entrada ou saída.")
    return (pd,)


@app.cell
def _(inverse_index, mo, notes, pd):
    _orphans = [
        {"id": n["id"], "title": n["title"], "folder": n["folder"], "status": n.get("status")}
        for n in notes
        if not n.get("links") and not inverse_index.get(n["id"])
    ]
    mo.ui.table(pd.DataFrame(_orphans)) if _orphans else mo.md("_Nenhuma nota órfã._")
    return ()


@app.cell
def _(all_slugs, mo, notes):
    import pandas as _pd2

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if link not in all_slugs
    ]
    mo.md(f"## 🔗 Links Quebrados\n\n{len(_broken)} links apontam para notas inexistentes no vault.")
    return ()


@app.cell
def _(all_slugs, mo, notes):
    import pandas as _pd3

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if link not in all_slugs
    ]
    mo.ui.table(_pd3.DataFrame(_broken)) if _broken else mo.md("_Nenhum link quebrado._")
    return ()


@app.cell
def _(mo, notes):
    import altair as alt
    import pandas as _pd4
    from collections import Counter

    _folder_notes = Counter(n["folder"] for n in notes)
    _folder_links = Counter(n["folder"] for n in notes for _ in n.get("links", []))
    _density = [
        {
            "pasta": folder,
            "notas": count,
            "links_saida": _folder_links.get(folder, 0),
            "densidade": round(_folder_links.get(folder, 0) / count, 2),
        }
        for folder, count in _folder_notes.items()
    ]
    _df = _pd4.DataFrame(_density)
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("densidade:Q", title="Links por nota"),
            y=alt.Y("pasta:N", sort="-x", title="Pasta"),
            tooltip=["pasta:N", "notas:Q", "links_saida:Q", "densidade:Q"],
        )
        .properties(title="Densidade de Links por Pasta", height=250)
    )
    mo.ui.altair_chart(_chart)
    return Counter, alt


@app.cell
def _(inverse_index, mo, notes):
    import pandas as _pd5

    _top = sorted(
        [{"nota": n["id"], "titulo": n["title"], "inbound": len(inverse_index.get(n["id"], []))}
         for n in notes],
        key=lambda x: x["inbound"],
        reverse=True,
    )[:10]
    mo.md("## ⭐ Top 10 Mais Referenciadas")
    mo.ui.table(_pd5.DataFrame(_top))
    return ()


if __name__ == "__main__":
    app.run()

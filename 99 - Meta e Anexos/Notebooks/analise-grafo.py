import marimo

app = marimo.App(width="medium")


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
        _notebooks_path = os.environ.get("VAULT_NOTEBOOKS_PATH", "lab")
        _path = os.path.join(os.getcwd(), "public", _notebooks_path, "vault-data.json")
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
    def _slugify(value):
        import re
        import unicodedata

        def _segment_slug(segment):
            segment = re.sub(r"^\d+\s*-\s*", "", segment)
            segment = unicodedata.normalize("NFD", segment)
            segment = segment.encode("ascii", "ignore").decode("ascii")
            segment = re.sub(r"\s+", "-", segment.lower().strip())
            segment = re.sub(r"[^a-z0-9-]", "", segment)
            segment = re.sub(r"-+", "-", segment)
            return segment.strip("-")

        return "/".join(filter(None, [_segment_slug(segment) for segment in value.split("/")]))

    all_slugs = {n["id"] for n in notes}
    inverse_index: dict[str, list[str]] = {n["id"]: [] for n in notes}
    for _n in notes:
        for _link in _n.get("links", []):
            _link_id = _slugify(_link)
            if _link_id in inverse_index:
                inverse_index[_link_id].append(_n["id"])
    return all_slugs, inverse_index, _slugify


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
def _(all_slugs, mo, notes, _slugify):
    import pandas as _pd2

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if _slugify(link) not in all_slugs
    ]
    mo.md(f"## 🔗 Links Quebrados\n\n{len(_broken)} links apontam para notas inexistentes no vault.")
    return ()


@app.cell
def _(all_slugs, mo, notes, _slugify):
    import pandas as _pd3

    _broken = [
        {"nota": n["id"], "link_quebrado": link}
        for n in notes
        for link in n.get("links", [])
        if _slugify(link) not in all_slugs
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

import marimo

__generated_with = "0.23.8"
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
        _raw = open_url("./vault-data.json").read()
        data = json.loads(_raw)
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
        f"# 📊 Análise de Publicação\n\n"
        f"**{len(notes)} notas** no vault · gerado em `{data['generated'][:10]}`"
    )
    return ()


@app.cell
def _(mo, notes):
    import altair as alt
    import pandas as pd
    from collections import Counter

    _counts = Counter((n.get("status") or "sem status") for n in notes)
    _df = pd.DataFrame([{"status": k, "count": v} for k, v in _counts.items()])
    _chart = (
        alt.Chart(_df)
        .mark_arc(innerRadius=50)
        .encode(
            theta=alt.Theta("count:Q"),
            color=alt.Color(
                "status:N",
                scale=alt.Scale(
                    domain=["published", "draft", "sem status"],
                    range=["#22c55e", "#f59e0b", "#94a3b8"],
                ),
            ),
            tooltip=["status:N", "count:Q"],
        )
        .properties(title="Status das Notas", width=300, height=300)
    )
    mo.ui.altair_chart(_chart)
    return Counter, alt, pd


@app.cell
def _(Counter, alt, mo, notes, pd):
    _counts = Counter(n["folder"] for n in notes)
    _df = pd.DataFrame([{"pasta": k, "notas": v} for k, v in _counts.most_common()])
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("notas:Q", title="Notas"),
            y=alt.Y("pasta:N", sort="-x", title="Pasta"),
            tooltip=["pasta:N", "notas:Q"],
        )
        .properties(title="Notas por Pasta", height=250)
    )
    mo.ui.altair_chart(_chart)
    return ()


@app.cell
def _(Counter, alt, mo, notes, pd):
    _all_tags = [tag for n in notes for tag in n.get("tags", [])]
    _counts = Counter(_all_tags).most_common(20)
    _df = pd.DataFrame(_counts, columns=["tag", "count"])
    _chart = (
        alt.Chart(_df)
        .mark_bar()
        .encode(
            x=alt.X("count:Q", title="Frequência"),
            y=alt.Y("tag:N", sort="-x", title="Tag"),
            tooltip=["tag:N", "count:Q"],
        )
        .properties(title="Top 20 Tags", height=400)
    )
    mo.ui.altair_chart(_chart)
    return ()


@app.cell
def _(mo, notes):
    _no_title = [n for n in notes if n["title"] == n["id"].split("/")[-1].replace("-", " ")]
    mo.md(f"## 🏷️ Notas sem título explícito\n\n{len(_no_title)} notas usam o basename como título.")
    return ()


@app.cell
def _(mo, notes):
    import pandas as _pd
    _folders = sorted({n["folder"] for n in notes})
    dropdown = mo.ui.dropdown(options=["Todas"] + _folders, value="Todas", label="Filtrar por pasta")
    dropdown
    return (dropdown,)


@app.cell
def _(dropdown, mo, notes):
    import pandas as _pd2
    _filtered = notes if dropdown.value == "Todas" else [n for n in notes if n["folder"] == dropdown.value]
    _df = _pd2.DataFrame(_filtered)[["id", "title", "folder", "status"]]
    mo.ui.table(_df)
    return ()


if __name__ == "__main__":
    app.run()

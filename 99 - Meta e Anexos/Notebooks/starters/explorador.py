import marimo

app = marimo.App(width="medium", title="Explorador do Vault")


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
        data = json.loads(open_url("../vault-data.json").read())
    except ImportError:
        _path = os.path.join(os.getcwd(), "public", "lab", "vault-data.json")
        with open(_path) as _f:
            data = json.load(_f)
    notes = data["notes"]
    return data, notes


@app.cell
def _(mo, notes):
    _folders = sorted({n["folder"] for n in notes})
    _all_tags = sorted({tag for n in notes for tag in n.get("tags", [])})

    folder_sel = mo.ui.dropdown(options=["Todas"] + _folders, value="Todas", label="Pasta")
    tags_sel = mo.ui.multiselect(options=_all_tags, label="Tags (qualquer)")
    status_sel = mo.ui.radio(
        options=["Todas", "published", "draft", "sem status"],
        value="Todas",
        label="Status",
    )
    mo.hstack([folder_sel, status_sel])
    return folder_sel, status_sel, tags_sel


@app.cell
def _(mo, tags_sel):
    mo.vstack([tags_sel])
    return ()


@app.cell
def _(folder_sel, mo, notes, status_sel, tags_sel):
    import pandas as pd

    def _matches(n: dict) -> bool:
        if folder_sel.value != "Todas" and n["folder"] != folder_sel.value:
            return False
        if status_sel.value != "Todas":
            if status_sel.value == "sem status" and n.get("status") is not None:
                return False
            if status_sel.value in ("published", "draft") and n.get("status") != status_sel.value:
                return False
        if tags_sel.value and not any(t in n.get("tags", []) for t in tags_sel.value):
            return False
        return True

    _filtered = [n for n in notes if _matches(n)]
    _df = pd.DataFrame(
        [{"título": n["title"], "pasta": n["folder"], "status": n.get("status") or "—", "tags": ", ".join(n.get("tags", []))}
         for n in _filtered]
    )
    mo.md(f"**{len(_filtered)} notas** encontradas")
    mo.ui.table(_df)
    return (pd,)


if __name__ == "__main__":
    app.run()

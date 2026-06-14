import marimo

__generated_with = "0.23.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _():
    import sys
    from pathlib import Path

    # Localiza _lab_notebook_runtime.py: na pasta pai quando rodando de starters/,
    # ou na pasta atual quando o notebook for copiado para 99 - Meta e Anexos/Notebooks/.
    _this_dir = Path(__file__).resolve().parent
    _runtime_dir = (
        _this_dir.parent
        if (_this_dir.parent / "_lab_notebook_runtime.py").exists()
        else _this_dir
    )
    if str(_runtime_dir) not in sys.path:
        sys.path.insert(0, str(_runtime_dir))

    from _lab_notebook_runtime import read_lab_json
    return (read_lab_json,)


@app.cell
def _(read_lab_json):
    data = read_lab_json("vault-data.json")
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
    mo.vstack([
        mo.md(f"**{len(_filtered)} notas** encontradas"),
        mo.ui.table(_df),
    ])
    return (pd,)


if __name__ == "__main__":
    app.run()

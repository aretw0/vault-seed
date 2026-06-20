import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    from datetime import date

    return date, mo


@app.cell
def _():
    import sys
    from pathlib import Path

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
    return (notes,)


@app.cell
def _(date, mo, notes):
    today = date.today().isoformat()
    _today_notes = [
        n for n in notes
        if (n.get("created") or "")[:10] == today
        or (n.get("updated") or "")[:10] == today
    ]
    _inbox = [n for n in notes if "00 -" in n.get("folder", "")]
    _drafts = [n for n in notes if n.get("status") == "draft"]

    mo.md(
        f"# ☀️ Revisão Diária — {today}\n\n"
        f"- 📥 **{len(_inbox)} notas** em `00 - Entrada`\n"
        f"- ✏️ **{len(_drafts)} drafts** pendentes\n"
        f"- 📝 **{len(_today_notes)} notas** criadas ou atualizadas hoje"
    )
    return (today,)


@app.cell
def _(mo, notes, today):
    import pandas as pd

    _today_notes = [
        {"titulo": n["title"], "pasta": n["folder"], "status": n.get("status")}
        for n in notes
        if (n.get("created") or "")[:10] == today
        or (n.get("updated") or "")[:10] == today
    ]
    mo.vstack([
        mo.md("## Notas de Hoje"),
        mo.ui.table(pd.DataFrame(_today_notes)) if _today_notes else mo.md("_Nenhuma nota criada ou atualizada hoje._"),
    ])
    return (pd,)


@app.cell
def _(mo, notes, pd):
    _inbox = [
        {"titulo": n["title"], "id": n["id"], "status": n.get("status")}
        for n in notes if "00 -" in n.get("folder", "")
    ]
    mo.vstack([
        mo.md("## 📥 Entrada"),
        mo.ui.table(pd.DataFrame(_inbox)) if _inbox else mo.md("_Entrada vazia._"),
    ])
    return


if __name__ == "__main__":
    app.run()

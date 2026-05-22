import marimo

app = marimo.App(width="medium", title="Revisão Diária")


@app.cell
def _():
    import marimo as mo
    import json
    import os
    from datetime import date
    return date, json, mo, os


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
    mo.md("## Notas de Hoje")
    mo.ui.table(pd.DataFrame(_today_notes)) if _today_notes else mo.md("_Nenhuma nota criada ou atualizada hoje._")
    return (pd,)


@app.cell
def _(mo, notes, pd):
    _inbox = [
        {"titulo": n["title"], "id": n["id"], "status": n.get("status")}
        for n in notes if "00 -" in n.get("folder", "")
    ]
    mo.md("## 📥 Entrada")
    mo.ui.table(pd.DataFrame(_inbox)) if _inbox else mo.md("_Entrada vazia._")
    return ()


if __name__ == "__main__":
    app.run()

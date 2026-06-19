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
        is_pyodide_runtime,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    qualidade = read_lab_dataset("qualidade-textos", manifest)
    context = lab_runtime_context()
    return context, is_pyodide_runtime, load_lab_manifest, manifest, qualidade, read_lab_dataset


@app.cell
def _(context, mo, qualidade):
    summary = qualidade.get("summary", {})
    total = summary.get("total", 0)
    n_fail = summary.get("fail", 0)
    n_warn = summary.get("warn", 0)
    n_pass = summary.get("pass", 0)
    profile = qualidade.get("profile", "default")
    collected = qualidade.get("collectedAt", "—")

    mo.vstack([
        mo.md(f"""
# Análise de qualidade de escrita

Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**
Coletado em: **{collected}** · Perfil: **{profile}**

| Notas avaliadas | PASS | Alertas (warn) | Falhas (fail) |
|---:|---:|---:|---:|
| {total} | {n_pass} | {n_warn} | {n_fail} |
"""),
    ])
    return collected, n_fail, n_pass, n_warn, profile, summary, total


@app.cell
def _(mo, qualidade):
    import pandas as pd
    import altair as alt

    notes = qualidade.get("notes", [])

    # Flatten findings across all notes
    rows = []
    for note in notes:
        for f in note.get("findings", []):
            rows.append({
                "nota": note["path"].replace("\\", "/").split("/")[-1].replace(".md", ""),
                "pasta": note["path"].replace("\\", "/").split("/")[0],
                "audience": note.get("audience", "todos"),
                "status": note["status"],
                "severidade": f["severity"],
                "regra": f["rule"],
            })

    if not rows:
        mo.md("Nenhum achado encontrado. Todas as notas passaram na avaliação.").center()
    else:
        df = pd.DataFrame(rows)

        rule_counts = df.groupby(["regra", "severidade"]).size().reset_index(name="ocorrências")
        _color_map = {"fail": "#ef4444", "warn": "#f59e0b", "info": "#94a3b8"}
        _domain = ["fail", "warn", "info"]
        _range = [_color_map[s] for s in _domain]

        chart_rules = (
            alt.Chart(rule_counts)
            .mark_bar()
            .encode(
                x=alt.X("ocorrências:Q", title="ocorrências"),
                y=alt.Y("regra:N", sort="-x", title=None),
                color=alt.Color(
                    "severidade:N",
                    scale=alt.Scale(domain=_domain, range=_range),
                    legend=alt.Legend(title="severidade"),
                ),
                tooltip=["regra:N", "severidade:N", "ocorrências:Q"],
            )
            .properties(height=max(80, len(rule_counts["regra"].unique()) * 28), title="Achados por regra")
        )

        mo.vstack([
            mo.md("## Achados por regra"),
            mo.ui.altair_chart(chart_rules),
        ])
    return alt, df, notes, pd, rows, rule_counts


@app.cell
def _(alt, df, mo, pd, rows):
    if not rows:
        mo.stop(True)

    audience_counts = df.groupby(["audience", "severidade"]).size().reset_index(name="ocorrências")
    _color_map = {"fail": "#ef4444", "warn": "#f59e0b", "info": "#94a3b8"}
    _domain = ["fail", "warn", "info"]
    _range = [_color_map[s] for s in _domain]

    chart_audience = (
        alt.Chart(audience_counts)
        .mark_bar()
        .encode(
            x=alt.X("ocorrências:Q"),
            y=alt.Y("audience:N", sort="-x", title="público"),
            color=alt.Color(
                "severidade:N",
                scale=alt.Scale(domain=_domain, range=_range),
                legend=None,
            ),
            tooltip=["audience:N", "severidade:N", "ocorrências:Q"],
        )
        .properties(height=max(60, len(audience_counts["audience"].unique()) * 32), title="Achados por público (audience)")
    )

    status_counts = pd.DataFrame(
        [(n["path"].replace("\\", "/").split("/")[-1].replace(".md", ""), n["status"]) for n in rows]
        if rows else [],
        columns=["nota", "status"]
    )

    mo.vstack([
        mo.md("## Distribuição por público"),
        mo.ui.altair_chart(chart_audience),
    ])
    return audience_counts, chart_audience, status_counts


@app.cell
def _(mo, notes, rows):
    if not rows:
        mo.stop(True)

    notes_with_findings = [
        {
            "nota": n["path"].replace("\\", "/"),
            "público": n.get("audience", "todos"),
            "status": n["status"],
            "falhas": n["counts"].get("fail", 0),
            "alertas": n["counts"].get("warn", 0),
            "infos": n["counts"].get("info", 0),
            "palavras": n.get("metrics", {}).get("words", 0),
        }
        for n in notes
        if n["status"] != "PASS"
    ]

    if not notes_with_findings:
        mo.md("Todas as notas passaram sem alertas.").center()
    else:
        mo.vstack([
            mo.md(f"## Notas com achados ({len(notes_with_findings)})"),
            mo.ui.table(
                notes_with_findings,
                selection=None,
            ),
        ])
    return (notes_with_findings,)


@app.cell
def _(mo, notes, rows):
    if not rows:
        mo.stop(True)

    # Top long sentences across all notes
    long_all = []
    for n in notes:
        for ls in n.get("metrics", {}).get("longSentences", [])[:3]:
            sentence = ls["sentence"]
            if len(sentence) > 200:
                sentence = sentence[:197] + "..."
            long_all.append({
                "nota": n["path"].replace("\\", "/").split("/")[-1].replace(".md", ""),
                "palavras": ls["words"],
                "frase": sentence,
            })

    long_all.sort(key=lambda x: -x["palavras"])

    if long_all:
        mo.vstack([
            mo.md("## Top frases longas"),
            mo.ui.table(long_all[:15], selection=None),
        ])
    else:
        mo.md("Nenhuma frase longa detectada.")
    return long_all, n, sentence


if __name__ == "__main__":
    app.run()

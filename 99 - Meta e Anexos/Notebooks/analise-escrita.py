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
        lab_altair_chart,
        lab_altair_status_color,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    qualidade = read_lab_dataset("qualidade-textos", manifest)
    context = lab_runtime_context()
    return context, lab_altair_chart, lab_altair_status_color, qualidade


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
    return


@app.cell
def _(lab_altair_chart, lab_altair_status_color, mo, qualidade):
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
        df = pd.DataFrame()
        rule_counts = pd.DataFrame()
        rules_result = mo.md("Nenhum achado encontrado. Todas as notas passaram na avaliação.").center()
    else:
        df = pd.DataFrame(rows)

        rule_counts = df.groupby(["regra", "severidade"]).size().reset_index(name="ocorrências")
        _color_map = {"fail": "#ef4444", "warn": "#f59e0b", "info": "#94a3b8"}
        _domain = ["fail", "warn", "info"]

        chart_rules = lab_altair_chart(
            alt.Chart(rule_counts)
            .mark_bar()
            .encode(
                x=alt.X("ocorrências:Q", title="ocorrências"),
                y=alt.Y("regra:N", sort="-x", title=None),
                color=lab_altair_status_color(
                    "severidade:N",
                    domain=_domain,
                    legend_title="severidade",
                    colors=_color_map,
                ),
                tooltip=["regra:N", "severidade:N", "ocorrências:Q"],
            )
            .properties(height=max(80, len(rule_counts["regra"].unique()) * 28), title="Achados por regra")
        )

        rules_result = mo.vstack([
            mo.md("## Achados por regra"),
            mo.ui.altair_chart(chart_rules),
        ])
    rules_result
    return alt, df, notes, pd, rows


@app.cell
def _(alt, df, lab_altair_chart, lab_altair_status_color, mo, pd, rows):
    if not rows:
        audience_result = mo.md("")
    else:
        audience_counts = df.groupby(["audience", "severidade"]).size().reset_index(name="ocorrências")
        _color_map = {"fail": "#ef4444", "warn": "#f59e0b", "info": "#94a3b8"}
        _domain = ["fail", "warn", "info"]

        chart_audience = lab_altair_chart(
            alt.Chart(audience_counts)
            .mark_bar()
            .encode(
                x=alt.X("ocorrências:Q"),
                y=alt.Y("audience:N", sort="-x", title="público"),
                color=lab_altair_status_color(
                    "severidade:N",
                    domain=_domain,
                    colors=_color_map,
                ),
                tooltip=["audience:N", "severidade:N", "ocorrências:Q"],
            )
            .properties(height=max(60, len(audience_counts["audience"].unique()) * 32), title="Achados por público (audience)")
        )

        audience_result = mo.vstack([
            mo.md("## Distribuição por público"),
            mo.ui.altair_chart(chart_audience),
        ])
    audience_result
    return


@app.cell
def _(mo, notes, rows):
    if not rows:
        notes_with_findings = []
        findings_result = mo.md("")
    else:
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
            findings_result = mo.md("Todas as notas passaram sem alertas.").center()
        else:
            findings_result = mo.vstack([
                mo.md(f"## Notas com achados ({len(notes_with_findings)})"),
                mo.ui.table(
                    notes_with_findings,
                    selection=None,
                ),
            ])
    findings_result
    return


@app.cell
def _(mo, notes, rows):
    if not rows:
        long_all = []
    else:
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
        long_sentences_result = mo.vstack([
            mo.md("## Top frases longas"),
            mo.ui.table(long_all[:15], selection=None),
        ])
    else:
        long_sentences_result = mo.md("Nenhuma frase longa detectada.")
    long_sentences_result
    return


if __name__ == "__main__":
    app.run()

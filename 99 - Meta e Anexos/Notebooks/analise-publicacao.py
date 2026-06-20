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
    perfil = read_lab_dataset("perfil-do-vault", manifest)
    curadoria = read_lab_dataset("curadoria-ia", manifest)
    context = lab_runtime_context()
    return (
        context,
        curadoria,
        lab_altair_chart,
        lab_altair_status_color,
        perfil,
    )


@app.cell
def _(context, mo, perfil):
    mo.vstack([
        mo.md(f"""
    # Análise de publicação

    Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

    | Capacidade | WASM | Local | CI |
    |---|:---:|:---:|:---:|
    | Distribuição de status e pastas | ✓ | ✓ | ✓ |
    | Auditoria de arquitetura de informação | ✓ | ✓ | ✓ |
    | Timeline por data de publicação | — | ✓ | ✓ |
    | Lista de notas com filtro | — | ✓ | ✓ |

    - **{perfil["noteCount"]}** notas · **{perfil["totalWords"]:,}** palavras · média **{perfil["averageWords"]}** palavras/nota
    """),
    ])
    return


@app.cell
def _(lab_altair_chart, lab_altair_status_color, mo, perfil):
    import altair as alt
    import pandas as pd

    statuses = perfil.get("statuses", [])
    status_df = pd.DataFrame(statuses).rename(columns={"name": "status", "count": "notas"})

    _color_map = {
        "published": "#22c55e",
        "ready": "#3b82f6",
        "draft": "#f59e0b",
        "sem status": "#94a3b8",
    }
    _domain = status_df["status"].tolist()

    chart_status = lab_altair_chart(
        alt.Chart(status_df)
        .mark_arc(innerRadius=50)
        .encode(
            theta=alt.Theta("notas:Q"),
            color=lab_altair_status_color(
                "status:N",
                domain=_domain,
                legend_title="status",
                colors=_color_map,
            ),
            tooltip=["status:N", "notas:Q"],
        )
        .properties(width=260, height=260, title="Status das notas")
    )

    folders = perfil.get("folders", [])
    folder_df = pd.DataFrame(folders).rename(columns={"name": "pasta", "count": "notas"})
    chart_folders = lab_altair_chart(
        alt.Chart(folder_df)
        .mark_bar()
        .encode(
            x=alt.X("notas:Q", title="notas"),
            y=alt.Y("pasta:N", sort="-x", title=None),
            color=alt.value("#2d7a4d"),
            tooltip=["pasta:N", "notas:Q"],
        )
        .properties(height=max(60, len(folder_df) * 28), title="Notas por pasta")
    )

    mo.vstack([
        mo.md("## Distribuição"),
        mo.hstack([mo.ui.altair_chart(chart_status), mo.ui.altair_chart(chart_folders)]),
    ])
    return alt, pd


@app.cell
def _(alt, lab_altair_chart, mo, pd, perfil):
    tags = perfil.get("tags", [])
    tag_df = pd.DataFrame(tags).rename(columns={"name": "tag", "count": "ocorrências"}).head(20)

    chart_tags = lab_altair_chart(
        alt.Chart(tag_df)
        .mark_bar()
        .encode(
            x=alt.X("ocorrências:Q"),
            y=alt.Y("tag:N", sort="-x", title=None),
            color=alt.value("#2d7a4d"),
            tooltip=["tag:N", "ocorrências:Q"],
        )
        .properties(height=max(80, len(tag_df) * 22), title="Top 20 tags")
    )
    mo.vstack([
        mo.md("## Tags"),
        mo.ui.altair_chart(chart_tags),
    ])
    return


@app.cell
def _(curadoria, lab_altair_chart, mo, pd):
    intent_dist = curadoria.get("intentDistribution", [])
    promotion = curadoria.get("promotionCandidates", [])
    thin = curadoria.get("thinPublishedResources", [])

    parts = [mo.md("## Auditoria de arquitetura de informação")]

    if intent_dist:
        import altair as _alt
        intent_df = pd.DataFrame(intent_dist).rename(columns={"label": "intenção", "count": "notas"})
        chart_intent = lab_altair_chart(
            _alt.Chart(intent_df)
            .mark_bar()
            .encode(
                x=_alt.X("notas:Q"),
                y=_alt.Y("intenção:N", sort="-x", title=None),
                color=_alt.value("#2d7a4d"),
                tooltip=["intenção:N", "notas:Q"],
            )
            .properties(height=max(60, len(intent_df) * 28), title="Distribuição de intenção")
        )
        parts.append(mo.ui.altair_chart(chart_intent))

    if promotion:
        promo_df = pd.DataFrame(promotion)
        cols = [c for c in ["title", "folder", "status"] if c in promo_df.columns]
        parts.append(mo.vstack([
            mo.md(f"**{len(promotion)} candidatas a promoção** — notas que atendem critérios para mudar de status"),
            mo.ui.table(promo_df[cols] if cols else promo_df),
        ]))

    if thin:
        thin_df = pd.DataFrame(thin)
        cols = [c for c in ["title", "folder", "words"] if c in thin_df.columns]
        parts.append(mo.vstack([
            mo.md(f"**{len(thin)} notas publicadas com conteúdo raso** — considere expandir ou arquivar"),
            mo.ui.table(thin_df[cols] if cols else thin_df),
        ]))

    mo.vstack(parts)
    return


@app.cell
def _(alt, context, lab_altair_chart, lab_altair_status_color, mo, pd):
    import os
    import re

    if not context["isLocal"]:
        timeline_result = mo.vstack([
            mo.md("## Timeline de publicação (local)"),
            mo.callout(
                mo.md("Execute com `uv run marimo edit` para ver a evolução de publicações por mês."),
                kind="info",
            ),
        ])
    else:
        _vault_root = context["cwd"]
        _folders_scan = [
            "10 - Diário", "20 - Projetos", "30 - Áreas",
            "40 - Recursos", "50 - Arquivo", "99 - Meta e Anexos",
        ]
        _date_re = re.compile(r"^(?:published_at|date|created):\s*(.+)$", re.MULTILINE)
        _status_re = re.compile(r"^status:\s*(.+)$", re.MULTILINE)

        rows = []
        for _folder in _folders_scan:
            _folder_path = os.path.join(_vault_root, _folder)
            if not os.path.isdir(_folder_path):
                continue
            for _root, _, _files in os.walk(_folder_path):
                for _fname in _files:
                    if not _fname.endswith(".md"):
                        continue
                    try:
                        with open(os.path.join(_root, _fname), encoding="utf-8") as _f:
                            _text = _f.read(2000)
                        _date_m = _date_re.search(_text)
                        if not _date_m:
                            continue
                        _date_raw = _date_m.group(1).strip().strip('"').strip("'")[:10]
                        _status_m = _status_re.search(_text)
                        _status = _status_m.group(1).strip() if _status_m else "sem status"
                        rows.append({"data": _date_raw, "status": _status, "pasta": _folder})
                    except Exception:
                        pass

        if rows:
            tl_df = pd.DataFrame(rows)
            tl_df["mes"] = pd.to_datetime(tl_df["data"], errors="coerce").dt.to_period("M").astype(str)
            tl_df = tl_df.dropna(subset=["mes"])
            tl_month = (
                tl_df.groupby(["mes", "status"])
                .size()
                .reset_index(name="notas")
                .sort_values("mes")
            )
            chart_tl = lab_altair_chart(
                alt.Chart(tl_month)
                .mark_bar()
                .encode(
                    x=alt.X("mes:O", title="mês", axis=alt.Axis(labelAngle=-45)),
                    y=alt.Y("notas:Q"),
                    color=lab_altair_status_color(
                        "status:N",
                        domain=["published", "ready", "draft", "sem status"],
                        legend_title="status",
                    ),
                    tooltip=["mes:O", "status:N", "notas:Q"],
                )
                .properties(
                    height=220,
                    title=f"Notas com data por mês ({len(rows)} notas com data detectada)",
                )
            )
            timeline_result = mo.vstack([
                mo.md("## Timeline de publicação (local)"),
                mo.ui.altair_chart(chart_tl),
            ])
        else:
            timeline_result = mo.vstack([
                mo.md("## Timeline de publicação (local)"),
                mo.callout(
                    mo.md("Nenhuma nota com `published_at`, `date` ou `created` no frontmatter encontrada."),
                    kind="warn",
                ),
            ])

    timeline_result
    return


@app.cell
def _(context, mo, pd, perfil):
    if not context["isLocal"]:
        filter_result = mo.vstack([
            mo.md("## Maiores notas (local)"),
            mo.callout(
                mo.md("Execute localmente para filtrar notas individualmente."),
                kind="info",
            ),
        ])
        notes_df = pd.DataFrame()
    else:
        largest = perfil.get("largestNotes", [])
        notes_df = pd.DataFrame(largest) if largest else pd.DataFrame()
        _folders_opts = (
            sorted(notes_df["folder"].unique().tolist())
            if not notes_df.empty and "folder" in notes_df.columns
            else []
        )
        folder_filter = mo.ui.dropdown(
            options=["Todas"] + _folders_opts,
            value="Todas",
            label="Filtrar por pasta",
        )
        filter_result = mo.vstack([
            mo.md("## Maiores notas"),
            folder_filter,
        ])

    filter_result
    return (notes_df,)


@app.cell
def _(context, mo, notes_df):
    if context["isLocal"] and not notes_df.empty:
        notes_table_result = mo.ui.table(notes_df)
    else:
        notes_table_result = mo.md("")
    notes_table_result
    return


if __name__ == "__main__":
    app.run()
